export interface ReplyQuote {
  messageId: string;
  text: string;
}

export interface UserTurn {
  text: string;
  pastes: string[];
  reply?: ReplyQuote;
}

const HEADER = "Konteks pesan RensChat:";
const QUESTION = "Pesan pengguna:";

function quoteLines(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

export function encodeUserTurn(turn: UserTurn): string {
  // Pesan biasa tetap dikirim persis seperti yang diketik.
  if (
    turn.pastes.length === 0 &&
    !turn.reply &&
    !turn.text.startsWith(`${HEADER}\n`)
  ) {
    return turn.text;
  }

  const sections = [HEADER];

  if (turn.reply) {
    sections.push(
      `Kutipan jawaban AI (${turn.reply.messageId}):`,
      quoteLines(turn.reply.text),
    );
  }

  turn.pastes.forEach((paste, index) => {
    sections.push(`Lampiran teks ${index + 1}:`, quoteLines(paste));
  });

  sections.push(QUESTION, turn.text);
  return sections.join("\n");
}

export function decodeUserTurn(raw: string): UserTurn {
  const plain: UserTurn = { text: raw, pastes: [] };

  if (!raw.startsWith(`${HEADER}\n`)) return plain;

  const lines = raw.split("\n");
  const pastes: string[] = [];
  let reply: ReplyQuote | undefined;
  let i = 1;

  function readQuote(): string | undefined {
    const selected: string[] = [];

    while (i < lines.length && lines[i].startsWith("> ")) {
      selected.push(lines[i].slice(2));
      i++;
    }

    return selected.length > 0 ? selected.join("\n") : undefined;
  }

  while (i < lines.length) {
    const label = lines[i++];

    if (label === QUESTION) {
      return {
        text: lines.slice(i).join("\n"),
        pastes,
        ...(reply ? { reply } : {}),
      };
    }

    const source = /^Kutipan jawaban AI \(([^()\r\n]+)\):$/.exec(label);

    if (source && !reply && pastes.length === 0) {
      const text = readQuote();
      if (text === undefined) return plain;
      reply = { messageId: source[1], text };
      continue;
    }

    if (label === `Lampiran teks ${pastes.length + 1}:`) {
      const text = readQuote();
      if (text === undefined) return plain;
      pastes.push(text);
      continue;
    }

    return plain;
  }

  return plain;
}
