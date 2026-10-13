import Link from "next/link";
import type { StackDetail } from "@/lib/stacks";
import type { StackGuide as Guide } from "@/lib/stack-guides";
import { toolEditorial } from "@/lib/tool-editorial";

export function StackGuide({ guide, stack }: { guide: Guide; stack: StackDetail }) {
  const tools = new Map(stack.stages.flatMap((stage) => stage.tools).map((tool) => [tool.slug, tool]));
  const sources = [...new Map(guide.rows.flatMap((row) => row.tools.flatMap((slug) => toolEditorial[slug]?.sources.map((source) => ({ ...source, name: tools.get(slug)?.name || slug })) ?? [])).map((source) => [source.url, source])).values()];
  return (
    <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-7" aria-labelledby="selection-guide">
      <h2 id="selection-guide" className="text-xl font-bold tracking-tight">How to choose this stack</h2>
      <p className="mt-3 max-w-[80ch] text-sm leading-7 text-secondary-foreground">{guide.recommendation}</p>
      <p className="mt-3 text-xs text-muted-foreground">By <Link href="/about" className="underline">Toools maintainers</Link> · Documentation reviewed <time dateTime={guide.reviewedOn}>{guide.reviewedOn}</time> · <Link href="/editorial-policy" className="underline">Editorial standards</Link></p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Tool choices, selection reasons, and checks for {guide.title}</caption>
          <thead><tr className="border-b border-border"><th scope="col" className="p-3 pl-0">Stage</th><th scope="col" className="p-3">Options</th><th scope="col" className="p-3">Why choose them</th><th scope="col" className="p-3 pr-0">Before committing</th></tr></thead>
          <tbody>{guide.rows.map((row) => <tr key={row.stage} className="border-b border-border/60 align-top">
            <th scope="row" className="p-3 pl-0 font-medium">{row.stage}</th>
            <td className="p-3"><ul className="space-y-2">{row.tools.map((slug) => {
              const tool = tools.get(slug);
              const source = toolEditorial[slug]?.sources[0];
              const name = tool?.name || ({ chatgpt: "ChatGPT", claude: "Claude", cursor: "Cursor", notion: "Notion", canva: "Canva", figma: "Figma", github: "GitHub", buffer: "Buffer", descript: "Descript", replit: "Replit", stackblitz: "StackBlitz", perplexity: "Perplexity", excalidraw: "Excalidraw", zapier: "Zapier", make: "Make", n8n: "n8n", vercel: "Vercel", railway: "Railway", supabase: "Supabase" } as Record<string, string>)[slug] || slug;
              return <li key={slug}>{tool?.slug ? <Link href={`/tools/${tool.slug}`} className="text-primary underline">{name}</Link> : source ? <a href={source.url} className="text-primary underline" target="_blank" rel="noopener noreferrer">{name} docs</a> : name}</li>;
            })}</ul></td>
            <td className="p-3 text-secondary-foreground leading-6">{row.rationale}</td><td className="p-3 pr-0 text-muted-foreground leading-6">{row.check}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="mt-7 grid gap-7 md:grid-cols-2">
        <div><h3 className="font-semibold">Connect the stages</h3><ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-secondary-foreground">{guide.handoffs.map((handoff) => <li key={handoff}>{handoff}</li>)}</ol></div>
        <div><h3 className="font-semibold">Budget checklist</h3><ul className="mt-3 list-disc space-y-3 pl-5 text-sm leading-6 text-secondary-foreground">{guide.budget.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-3 text-xs text-muted-foreground">Check current provider pricing for your usage. This guide does not quote a fixed monthly total.</p></div>
      </div>
      {stack.slug === "ai-product-builder" && <p className="mt-6 text-sm"><Link href="/compare/n8n-vs-make-vs-zapier" className="text-primary underline">Compare n8n, Make, and Zapier by deployment, billing, and maintenance.</Link></p>}
      <div className="mt-7 space-y-5"><h3 className="font-semibold">Common decisions</h3>{guide.questions.map((item) => <div key={item.question}><h4 className="text-sm font-semibold">{item.question}</h4><p className="mt-1 text-sm leading-6 text-secondary-foreground">{item.answer}</p></div>)}</div>
      <details className="mt-7 border-t border-border pt-4"><summary className="cursor-pointer text-sm font-semibold">Official sources and review basis</summary><p className="mt-3 text-xs leading-6 text-muted-foreground">The capability descriptions reference provider documentation. Selection advice and budgeting checks are Toools editorial judgments; they are not comparative performance tests.</p><ul className="mt-3 grid gap-2 text-xs sm:grid-cols-2">{sources.map((source) => <li key={source.url}><a href={source.url} className="text-primary underline" target="_blank" rel="noopener noreferrer">{source.name}: {source.label}</a></li>)}</ul></details>
    </section>
  );
}
