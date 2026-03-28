import { generateDiagramViaOpenRouter } from "./openrouter-image";
import {
  getTextModel,
  openRouterChatText,
  OPENROUTER_PDF_PLUGINS,
} from "./openrouter-client";
import {
  DIAGRAM_PLANNER_SYSTEM_PROMPT,
  DIAGRAM_STYLIST_SYSTEM_PROMPT,
  DIAGRAM_CRITIC_SYSTEM_PROMPT,
  STYLE_GUIDE,
  PDF_EXTRACTION_PROMPT,
} from "./prompts";

export interface PipelineResult {
  paperTitle: string;
  paperDomain: string;
  suggestedCaption: string;
  keyComponents: string[];
  methodologyText: string;
  plannerDescription: string;
  stylistDescription: string;
  imageBase64: string | null;
  criticSuggestions: string | null;
  criticRevisedDescription: string | null;
  finalImageBase64: string | null;
}

function pdfDataUrl(pdfBase64: string): string {
  if (pdfBase64.startsWith("data:")) return pdfBase64;
  return `data:application/pdf;base64,${pdfBase64}`;
}

export async function extractPaperContent(
  pdfBase64: string,
  onStep: (step: string) => void
): Promise<{
  methodology_text: string;
  suggested_caption: string;
  paper_domain: string;
  paper_title: string;
  key_components: string[];
}> {
  onStep("Analyzing PDF with OpenRouter…");
  const model = getTextModel();

  const text = await openRouterChatText({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PDF_EXTRACTION_PROMPT },
          {
            type: "file",
            file: {
              filename: "paper.pdf",
              file_data: pdfDataUrl(pdfBase64),
            },
          },
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 8192,
    plugins: OPENROUTER_PDF_PLUGINS,
  });

  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    return {
      methodology_text: text,
      suggested_caption: "Figure 1: System Overview",
      paper_domain: "general_ml",
      paper_title: "Research Paper",
      key_components: [],
    };
  }
}

export async function runPlannerAgent(
  methodologyText: string,
  caption: string,
  onStep: (step: string) => void
): Promise<string> {
  onStep("Planner Agent: Creating detailed diagram description…");
  const model = getTextModel();

  const prompt = `Now, based on the following methodology section and diagram caption, provide a detailed description for the figure to be generated.
Methodology Section: ${methodologyText}
Diagram Caption: ${caption}
Detailed description of the target figure to be generated (do not include figure titles):`;

  return openRouterChatText({
    model,
    messages: [
      { role: "system", content: DIAGRAM_PLANNER_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 8192,
  });
}

export async function runStylistAgent(
  plannerDescription: string,
  methodologyText: string,
  caption: string,
  onStep: (step: string) => void
): Promise<string> {
  onStep("Stylist Agent: Refining aesthetic details…");
  const model = getTextModel();

  const prompt = `Detailed Description: ${plannerDescription}
Style Guidelines: ${STYLE_GUIDE}
Methodology Section: ${methodologyText}
Diagram Caption: ${caption}
Your Output:`;

  return openRouterChatText({
    model,
    messages: [
      { role: "system", content: DIAGRAM_STYLIST_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 8192,
  });
}

export async function runVisualizerAgent(
  description: string,
  aspectRatio: string,
  onStep: (step: string) => void
): Promise<string | null> {
  const prompt = `Render an image based on the following detailed description: ${description}
Note that do not include figure titles in the image. Diagram:`;

  try {
    return await generateDiagramViaOpenRouter(prompt, aspectRatio, onStep);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    onStep(`Visualizer (OpenRouter) failed: ${msg}`);
    return null;
  }
}

export async function runCriticAgent(
  imageBase64: string,
  description: string,
  methodologyText: string,
  caption: string,
  onStep: (step: string) => void
): Promise<{ suggestions: string; revisedDescription: string }> {
  onStep("Critic Agent: Reviewing and refining diagram…");
  const model = getTextModel();

  const imageUrl = `data:image/png;base64,${imageBase64}`;

  const text = await openRouterChatText({
    model,
    messages: [
      { role: "system", content: DIAGRAM_CRITIC_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Target Diagram for Critique:" },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
          {
            type: "text",
            text: `Detailed Description: ${description}
Methodology Section: ${methodologyText}
Figure Caption: ${caption}
Your Output:`,
          },
        ],
      },
    ],
    temperature: 0.5,
    max_tokens: 8192,
  });

  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

  try {
    const parsed = JSON.parse(jsonStr.trim());
    return {
      suggestions: parsed.critic_suggestions ?? "No changes needed.",
      revisedDescription: parsed.revised_description ?? "No changes needed.",
    };
  } catch {
    return {
      suggestions: "Unable to parse critic output.",
      revisedDescription: description,
    };
  }
}

export async function runFullPipeline(
  pdfBase64: string,
  customCaption: string | undefined,
  aspectRatio: string,
  criticRounds: number,
  onStep: (step: string) => void
): Promise<PipelineResult> {
  const extracted = await extractPaperContent(pdfBase64, onStep);

  const caption = customCaption?.trim() || extracted.suggested_caption;

  const plannerDesc = await runPlannerAgent(
    extracted.methodology_text,
    caption,
    onStep
  );

  const stylistDesc = await runStylistAgent(
    plannerDesc,
    extracted.methodology_text,
    caption,
    onStep
  );

  let imageBase64 = await runVisualizerAgent(stylistDesc, aspectRatio, onStep);

  let criticSuggestions: string | null = null;
  let criticRevisedDescription: string | null = null;
  let finalImageBase64 = imageBase64;
  let currentDesc = stylistDesc;

  for (let round = 0; round < criticRounds; round++) {
    if (!finalImageBase64) break;

    onStep(`Critic Round ${round + 1}/${criticRounds}…`);
    const criticResult = await runCriticAgent(
      finalImageBase64,
      currentDesc,
      extracted.methodology_text,
      caption,
      onStep
    );

    criticSuggestions = criticResult.suggestions;
    criticRevisedDescription = criticResult.revisedDescription;

    if (
      criticResult.revisedDescription.trim() === "No changes needed." ||
      criticResult.suggestions.trim() === "No changes needed."
    ) {
      onStep("Critic: No changes needed. Diagram approved!");
      break;
    }

    currentDesc = criticResult.revisedDescription;
    onStep(`Re-generating diagram with critic feedback (round ${round + 1})…`);
    const newImage = await runVisualizerAgent(currentDesc, aspectRatio, onStep);
    if (newImage) {
      finalImageBase64 = newImage;
    }
  }

  onStep("Pipeline complete!");

  return {
    paperTitle: extracted.paper_title,
    paperDomain: extracted.paper_domain,
    suggestedCaption: caption,
    keyComponents: extracted.key_components,
    methodologyText: extracted.methodology_text,
    plannerDescription: plannerDesc,
    stylistDescription: stylistDesc,
    imageBase64,
    criticSuggestions,
    criticRevisedDescription,
    finalImageBase64,
  };
}
