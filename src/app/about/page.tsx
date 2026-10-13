import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbData, pageMetadata } from "@/lib/seo";
import { GITHUB_ISSUES_URL, GITHUB_REPO_URL } from "@/lib/site";

export const metadata = pageMetadata("About Toools", "Toools is an open-source tool curation project organized around workflows, with source-linked guidance for indie developers, AI builders, and creators.", "/about");

export default function AboutPage() {
  return <article className="mx-auto max-w-3xl px-6 py-10 sm:py-12">
    <JsonLd data={breadcrumbData([{ name: "Home", path: "/" }, { name: "About Toools", path: "/about" }])} />
    <h1 className="text-3xl font-bold tracking-tight">About Toools</h1>
    <p className="mt-5 text-base leading-8 text-secondary-foreground">Toools helps indie developers, AI product builders, and creators choose tools for an entire workflow. Start with the task you want to complete, compare the options for each stage, and follow the links to the providers before deciding.</p>
    <h2 className="mt-8 text-xl font-semibold">Maintained in public</h2>
    <p className="mt-3 text-sm leading-7 text-secondary-foreground">Toools is an open-source project maintained through its <a href={GITHUB_REPO_URL} className="text-primary underline" target="_blank" rel="noopener noreferrer">GitHub repository</a>. Guidance credited to “Toools maintainers” is the project&apos;s editorial voice. Provider documentation, imported listings, and editorial judgments serve different roles; a listing does not imply that every feature has been tested.</p>
    <h2 className="mt-8 text-xl font-semibold">How the collection works</h2>
    <p className="mt-3 text-sm leading-7 text-secondary-foreground">Tool pages describe individual products. <Link href="/stacks" className="text-primary underline">Stacks</Link> connect them to practical stages such as research, prototyping, design, deployment, and distribution. Source-linked guides explain what to check before committing to a provider.</p>
    <p className="mt-3 text-sm leading-7 text-secondary-foreground">Read our <Link href="/editorial-policy" className="text-primary underline">editorial standards</Link> for the review basis, dates, and recommendation criteria.</p>
    <h2 className="mt-8 text-xl font-semibold">Suggest a correction or a tool</h2>
    <p className="mt-3 text-sm leading-7 text-secondary-foreground">Report outdated information through <a href={GITHUB_ISSUES_URL} className="text-primary underline" target="_blank" rel="noopener noreferrer">GitHub Issues</a>, including the affected page and a primary source. To suggest a new listing, use the <Link href="/submit" className="text-primary underline">submission guide</Link>.</p>
  </article>;
}
