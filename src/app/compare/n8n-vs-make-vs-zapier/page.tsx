import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbData, pageMetadata, siteUrl } from "@/lib/seo";
import { toolEditorial } from "@/lib/tool-editorial";

const path = "/compare/n8n-vs-make-vs-zapier";
const title = "n8n vs Make vs Zapier: How to Choose";
const description = "Compare n8n, Make, and Zapier by deployment, billing units, maintenance responsibilities, and licensing, using official documentation.";
export const metadata = pageMetadata(title, description, path);
const rows = [
  { dimension: "Deployment", n8n: "Self-hosted and hosted options; choose the operating model deliberately.", make: "Managed visual scenarios; check the service and connector requirements.", zapier: "Managed app workflows; check that the required actions and integrations are supported." },
  { dimension: "Budgeting basis", n8n: "Check the chosen edition and current plan; self-hosting also adds infrastructure and operations costs.", make: "Estimate credits for the actual scenario, including the steps you use.", zapier: "Estimate billable tasks and the plan features your workflow requires." },
  { dimension: "Maintenance", n8n: "For self-hosting, plan for upgrades, backups, security, and service availability.", make: "The provider operates the platform; you maintain the connections, scenario logic, and failure handling.", zapier: "The provider operates the platform; you maintain the connections, workflow logic, and failure handling." },
  { dimension: "License and terms", n8n: "Source-available Sustainable Use License. Review conditions for customer-facing or commercial embedding.", make: "Review service terms and the selected plan.", zapier: "Review service terms and the selected plan." },
  { dimension: "Editorial starting point", n8n: "Evaluate when hosting control is required and someone can operate the infrastructure.", make: "Evaluate when visual branching and data transformations fit the team's workflow.", zapier: "Evaluate when managed app connections and an understandable workflow fit the task." },
];

export default function AutomationComparisonPage() {
  return <article className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
    <JsonLd data={breadcrumbData([{ name: "Home", path: "/" }, { name: "Tool Stacks", path: "/stacks" }, { name: title, path }])} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: title, description, mainEntityOfPage: siteUrl(path), dateModified: "2026-10-13", inLanguage: "en", author: { "@type": "Organization", name: "Toools maintainers", url: siteUrl("/about") }, publisher: { "@id": `${siteUrl()}#publisher` } }} />
    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
    <p className="mt-5 max-w-[80ch] text-base leading-8 text-secondary-foreground">Start with the integrations and operating model your workflow requires. Evaluate Zapier for managed app connections, Make for visual scenarios, and self-hosted n8n when infrastructure control is a requirement you can support. There is no universal winner: test the same representative workflow before choosing.</p>
    <p className="mt-3 text-xs text-muted-foreground">By <Link href="/about" className="underline">Toools maintainers</Link> · Documentation reviewed <time dateTime="2026-10-13">2026-10-13</time> · <Link href="/editorial-policy" className="underline">Editorial standards</Link></p>
    <div className="mt-8 overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><caption className="sr-only">n8n, Make, and Zapier comparison by deployment, costs, maintenance, and licensing</caption><thead><tr className="border-b border-border"><th scope="col" className="p-3 pl-0">Decision</th>{["n8n", "Make", "Zapier"].map((name) => <th key={name} scope="col" className="p-3">{name}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.dimension} className="border-b border-border/60 align-top"><th scope="row" className="p-3 pl-0 font-medium">{row.dimension}</th>{[row.n8n, row.make, row.zapier].map((value, index) => <td key={index} className="p-3 leading-6 text-secondary-foreground">{value}</td>)}</tr>)}</tbody></table></div>
    <h2 className="mt-9 text-xl font-semibold">Compare the same real workflow</h2>
    <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-secondary-foreground"><li>List the trigger, required applications, transformations, branching, and final output.</li><li>Confirm the exact connector actions, credentials, and rate limits you need.</li><li>Run a representative input, an invalid input, and a retry after a failed step.</li><li>Calculate expected monthly usage using each provider&apos;s current billing units. Do not compare a task, a credit, and an execution as though they were equivalent.</li><li>Record who owns failures, credential changes, backups, and upgrades.</li></ol>
    <h2 className="mt-9 text-xl font-semibold">Is n8n open source?</h2>
    <p className="mt-3 text-sm leading-7 text-secondary-foreground">n8n&apos;s repository uses the Sustainable Use License for its main code, with separate terms for enterprise files. This is source-available software with restrictions on use and distribution. Check the <a href="https://github.com/n8n-io/n8n/blob/master/LICENSE.md" className="text-primary underline" target="_blank" rel="noopener noreferrer">license conditions</a> for your intended use. Self-hosting does not remove those conditions.</p>
    <h2 className="mt-9 text-xl font-semibold">Which is cheapest?</h2>
    <p className="mt-3 text-sm leading-7 text-secondary-foreground">That depends on the workflow, volume, selected features, and the operating model. For self-hosting, include infrastructure and maintenance time. For managed tools, include the billable steps and plan requirements. This comparison does not claim a price winner without a workload estimate.</p>
    <h2 className="mt-9 text-xl font-semibold">Official sources</h2>
    <p className="mt-3 text-sm leading-7 text-muted-foreground">Deployment and billing descriptions reference these provider pages. Selection advice is an editorial judgment, not a performance benchmark.</p>
    <ul className="mt-4 space-y-2 text-sm">{["n8n", "make", "zapier"].flatMap((slug) => toolEditorial[slug].sources.map((source) => <li key={source.url}><a href={source.url} className="text-primary underline" target="_blank" rel="noopener noreferrer">{slug === "make" ? "Make" : slug === "zapier" ? "Zapier" : "n8n"}: {source.label}</a></li>))}</ul>
    <p className="mt-8 text-sm"><Link href="/stacks/ai-product-builder" className="text-primary underline">See how automation fits into the AI product development stack →</Link></p>
  </article>;
}
