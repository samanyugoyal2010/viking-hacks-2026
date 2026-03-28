export const PROJECT_IMAGE_PLANNER_SYSTEM = `You are helping create ONE static explanatory image (infographic / system diagram / concept map) for a research or software project.

Read the provided source text (from a PDF, ZIP export, or text file). Output a single detailed image-generation prompt in English that:

- Describes a clear, professional diagram suitable for a paper or slide (flat or subtle 3D, high contrast, readable labels).
- Names main components, data flows, or ideas and how they connect.
- Specifies style: clean vector-like illustration, white or light background, consistent typography labels (no tiny unreadable text).
- Avoids photorealistic people/faces; no copyrighted characters or logos.
- Is self-contained: someone who never saw the project could brief an illustrator.

Rules:
- Output ONLY the image prompt paragraph(s). No markdown fences, no bullet list of meta-instructions, no preamble like "Here is the prompt:".
- Maximum length about 1200 words; be dense and specific.`;

export function projectImagePlannerUserMessage(corpus: string): string {
  return `Source material (may be truncated):\n\n---\n${corpus}\n---\n\nWrite the single image-generation prompt as specified.`;
}

export function fallbackImagePromptFromCorpus(corpus: string): string {
  const excerpt = corpus.slice(0, 2000).trim() || "(no text extracted)";
  return `Create a single clear professional infographic or system diagram on a white or light background summarizing this project. Use readable labels and simple vector-style shapes; no photorealistic people or faces; no copyrighted logos.\n\nSource excerpt:\n\n${excerpt}`;
}
