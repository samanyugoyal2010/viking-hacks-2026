import { get, set, del } from "idb-keyval";

const PREFIX = "explain-research:";

const K_CORPUS = `${PREFIX}corpus`;
const K_META = `${PREFIX}meta`;
const K_MESSAGES = `${PREFIX}messages`;

export type ExplainResearchMeta = {
  zipName: string;
  extractedAt: string;
  corpusTruncated: boolean;
  corpusCharCount: number;
  textFilesIncluded: number;
  totalZipEntries: number;
  includedPathsSample: string[];
};

export type ExplainChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function saveExplainProject(
  corpus: string,
  meta: ExplainResearchMeta,
  messages: ExplainChatMessage[]
): Promise<void> {
  await set(K_CORPUS, corpus);
  await set(K_META, meta);
  await set(K_MESSAGES, messages);
}

export async function loadExplainProject(): Promise<{
  corpus: string;
  meta: ExplainResearchMeta;
  messages: ExplainChatMessage[];
} | null> {
  const corpus = await get<string | undefined>(K_CORPUS);
  const meta = await get<ExplainResearchMeta | undefined>(K_META);
  const messages = await get<ExplainChatMessage[] | undefined>(K_MESSAGES);
  if (typeof corpus !== "string" || !meta) return null;
  return {
    corpus,
    meta,
    messages: Array.isArray(messages) ? messages : [],
  };
}

export async function saveExplainMessages(
  messages: ExplainChatMessage[]
): Promise<void> {
  await set(K_MESSAGES, messages);
}

export async function clearExplainProject(): Promise<void> {
  await del(K_CORPUS);
  await del(K_META);
  await del(K_MESSAGES);
}
