import { WorkflowEntrypoint, type WorkflowStep, type WorkflowEvent } from "cloudflare:workers";
import type { DigestLang } from "@dak/contract";
import { gatherBrief, draftEdition } from "./agent";
import { persistEdition } from "./store";
import { sendEdition } from "./send";
import type { Bindings, DigestWorkflowParams } from "./types";

const DEFAULT_LANGS: DigestLang[] = ["en", "zh"];

/**
 * Durable daily-digest pipeline. Each step is memoized and retried
 * independently, so a mid-run failure resumes without re-doing prior work and
 * re-runs simply overwrite the (date, lang) edition.
 */
export class DigestWorkflow extends WorkflowEntrypoint<Bindings, DigestWorkflowParams> {
  override async run(event: WorkflowEvent<DigestWorkflowParams>, step: WorkflowStep) {
    const date = event.payload?.date ?? new Date().toISOString().slice(0, 10);
    const langs = event.payload?.langs ?? DEFAULT_LANGS;
    console.log(`[digest-wf] run start date=${date} langs=${langs.join(",")}`);

    // STEP 1 — research the day once; shared by every language edition.
    const brief = await step.do(
      "gather",
      {
        retries: { limit: 2, delay: "10 seconds", backoff: "exponential" },
        timeout: "5 minutes",
      },
      async () => gatherBrief(this.env, date)
    );
    console.log(`[digest-wf] gather done items=${brief.items.length}`);

    const results: { lang: DigestLang; sections: number; recipients: number; sent: number }[] = [];

    for (const lang of langs) {
      const content = await step.do(
        `draft-${lang}`,
        {
          retries: { limit: 2, delay: "10 seconds", backoff: "exponential" },
          timeout: "3 minutes",
        },
        async () => draftEdition(this.env, brief, lang, date)
      );

      await step.do(`persist-${lang}`, async () => {
        await persistEdition(this.env.DB, date, lang, content);
        return { ok: true };
      });
      console.log(`[digest-wf] persisted ${lang}: ${content.title}`);

      const sent = await step.do(`send-${lang}`, async () =>
        sendEdition(this.env, date, lang, content)
      );

      results.push({ lang, sections: content.sections.length, ...sent });
    }

    return { date, results };
  }
}
