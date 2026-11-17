import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import type { ChartBlock } from "../../types";
import { useTranslation } from "react-i18next";

export function ChartBlockView({ block }: { block: ChartBlock }) {
  const { t } = useTranslation();

  const colors = [
    "#C96442",
    "#5B7FA6",
    "#6B8F71",
    "#C9962B",
    "#8B6BA8",
    "#C25B7A",
    "#4F9DA6",
    "#8A8579",
  ];

  const renderChart = () => {
    const data = (block.data || []).map((d) => {
      const obj: any = { [block.xKey]: d[block.xKey] };
      block.series.forEach((s) => {
        obj[s.key] = Number(d[s.key]) || 0;
      });
      return obj;
    });

    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: -20, bottom: 0 },
    };
    const axisProps = {
      stroke: "var(--text-muted)",
      fontSize: 12,
      tickLine: false,
      axisLine: false,
    };

    switch (block.kind) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis dataKey={block.xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            {block.series.length > 1 && (
              <Legend wrapperStyle={{ fontSize: 13 }} />
            )}
            {block.series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label || s.key}
                fill={colors[i % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis dataKey={block.xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            {block.series.length > 1 && (
              <Legend wrapperStyle={{ fontSize: 13 }} />
            )}
            {block.series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label || s.key}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        );
      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis dataKey={block.xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            {block.series.length > 1 && (
              <Legend wrapperStyle={{ fontSize: 13 }} />
            )}
            {block.series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label || s.key}
                fill={colors[i % colors.length]}
                stroke={colors[i % colors.length]}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        );
      case "pie":
        return (
          <PieChart>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Pie
              data={data}
              dataKey={block.series[0]?.key}
              nameKey={block.xKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill={colors[0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={block.xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            {block.series.map((s, i) => (
              <Scatter
                key={s.key}
                name={s.label || s.key}
                dataKey={s.key}
                fill={colors[i % colors.length]}
              />
            ))}
          </ScatterChart>
        );
      default:
        // Fallback element agar TypeScript tidak error dan UI tidak crash
        return (
          <div className="flex items-center justify-center h-full text-sm text-muted">
            {t("blocks.unsupportedChart")}
          </div>
        );
    }
  };

  return (
    <div className="my-4 bg-surface border border-line rounded-xl p-4">
      {block.title && (
        <h4 className="text-sm font-semibold mb-4 px-2">{block.title}</h4>
      )}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
