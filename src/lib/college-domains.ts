import data from "@/data/indian_college_pairs.json";

type CollegeEntry = { name: string; domain: string };

const colleges: CollegeEntry[] = data as CollegeEntry[];

const domainSet = new Set(colleges.map((c) => c.domain.toLowerCase()));

const domainToName = new Map(
  colleges.map((c) => [c.domain.toLowerCase(), c.name]),
);

export function getDomainFromEmail(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).toLowerCase().trim();
}

export function isCollegeEmail(email: string): boolean {
  const domain = getDomainFromEmail(email);
  return domainSet.has(domain);
}

export function getCollegeName(email: string): string | null {
  const domain = getDomainFromEmail(email);
  return domainToName.get(domain) ?? null;
}