import { ArrowRight, BarChart3, Bird, CalendarDays, CircleAlert, CircleDollarSign, ClipboardList, Droplets, Egg, Fish, FlaskConical, Gauge, Grid3X3, HeartPulse, Home, Leaf, Map, Package, PiggyBank, Sprout, TreePine, Users, Wheat, Wrench } from "lucide-react";
import { useLocation } from "wouter";
import { PageHeading } from "@/components/farm-shell";
import { Panel } from "@/components/ui-kit";

type Card = { title: string; description: string; href: string; Icon: typeof Home };
type CardGroup = { title: string; eyebrow: string; cards: Card[] };

const groups: CardGroup[] = [
  { eyebrow: "Start here", title: "Overview", cards: [
    { title: "Farm overview", description: "See the live farm dashboard: stock, water, tasks, alerts, activity, and money at a glance.", href: "/overview", Icon: BarChart3 },
    { title: "Today's work", description: "See the jobs due today, complete work, and keep the daily field book moving.", href: "/today", Icon: ClipboardList },
    { title: "Farm map", description: "Open the Boroma Hills site plan and inspect each operating zone.", href: "/farm-map", Icon: Map },
    { title: "Search farm", description: "Find records, animals, inventory, tasks, and other information quickly.", href: "/search", Icon: Gauge },
  ] },
  { eyebrow: "Production", title: "Growing & livestock", cards: [
    { title: "Livestock", description: "See the live animal picture across goats, poultry, pigs, and fish.", href: "/livestock", Icon: Users },
    { title: "Goat register", description: "Manage individual goats, pregnancy, health, weights, and history.", href: "/livestock/goats", Icon: Egg },
    { title: "Poultry batches", description: "Track batches, feed, mortality, weights, production, and sales.", href: "/livestock/poultry", Icon: Bird },
    { title: "Pigs", description: "Register pigs and track health, feed, breeding, mortality, and sales.", href: "/pigs", Icon: PiggyBank },
    { title: "Fish", description: "Track tanks, species, stocking, growth, feed, mortality, and harvest.", href: "/fish", Icon: Fish },
    { title: "Crops", description: "Manage crop cycles from planting through harvest and production records.", href: "/crops", Icon: Wheat },
    { title: "Crop activities", description: "Record planting, irrigation, weeding, fertilising, scouting, and harvest work.", href: "/crop-activities", Icon: Sprout },
    { title: "Home garden", description: "Track household food production, harvest, consumption, and sales.", href: "/garden", Icon: Home },
    { title: "Commercial garden", description: "Manage vegetable beds, planting, inputs, harvest, and economics.", href: "/commercial-garden", Icon: Grid3X3 },
    { title: "Greenhouse", description: "Plan protected production, planting, plant counts, and growing conditions.", href: "/greenhouse", Icon: Leaf },
    { title: "Orchard", description: "Register trees and follow planting, location, and fruit production.", href: "/orchard", Icon: TreePine },
  ] },
  { eyebrow: "Resources", title: "Water & infrastructure", cards: [
    { title: "Water tanks", description: "Monitor storage capacity and record real water levels without invented readings.", href: "/water", Icon: Droplets },
    { title: "Water usage", description: "Record water consumed by irrigation, livestock, fish, household, and other uses.", href: "/water/usage", Icon: Gauge },
    { title: "Irrigation", description: "Log irrigation targets, methods, duration, and estimated water use.", href: "/irrigation", Icon: Droplets },
    { title: "Equipment", description: "Keep a register of pumps, tools, hoses, solar assets, and maintenance dates.", href: "/equipment", Icon: Wrench },
    { title: "Inventory", description: "Track feed, veterinary supplies, fuel, and other stores before they run low.", href: "/inventory", Icon: Package },
    { title: "Fish water quality", description: "Record temperature, pH, oxygen, ammonia, clarity, and tank conditions.", href: "/fish/water-quality", Icon: FlaskConical },
  ] },
  { eyebrow: "Money & decisions", title: "Finance & reporting", cards: [
    { title: "Sales", description: "Record farm sales and connect them to the financial ledger.", href: "/sales", Icon: CircleDollarSign },
    { title: "Expenses", description: "Capture farm spending and connect operating costs to finance.", href: "/expenses", Icon: CircleDollarSign },
    { title: "Finance", description: "Review revenue, expenses, and the farm's financial position.", href: "/finance", Icon: BarChart3 },
    { title: "Reports", description: "Turn farm records into management information for better decisions.", href: "/reports", Icon: BarChart3 },
  ] },
  { eyebrow: "Records & control", title: "Farm records", cards: [
    { title: "Animal health", description: "Record vaccinations, treatments, injuries, inspections, and follow-ups.", href: "/health", Icon: HeartPulse },
    { title: "Crop health", description: "Record pests, diseases, observations, severity, and follow-up actions.", href: "/crop-health", Icon: Leaf },
    { title: "Alerts", description: "See health, water, stock, pregnancy, and operational issues needing attention.", href: "/alerts", Icon: CircleAlert },
    { title: "Tasks", description: "Create, assign, search, and sign off farm jobs.", href: "/tasks", Icon: ClipboardList },
    { title: "Calendar", description: "Keep scheduled farm activities and important dates in one place.", href: "/calendar", Icon: CalendarDays },
    { title: "Demo data", description: "Load clearly marked sample records for testing, then reset them safely.", href: "/demo-data", Icon: FlaskConical },
  ] },
];

function HomeCard({ card }: { card: Card }) {
  const [, setLocation] = useLocation();
  const Icon = card.Icon;
  return <button type="button" onClick={() => setLocation(card.href)} data-testid={`home-card-${card.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="group flex min-h-[170px] flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-left shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/.4)] hover:shadow-[var(--shadow-md)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.35)]">
    <div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] transition group-hover:bg-[hsl(var(--primary))] group-hover:text-[hsl(var(--primary-foreground))]"><Icon size={20} /></div><ArrowRight size={17} className="mt-1 text-[hsl(var(--muted-foreground))] transition group-hover:translate-x-1 group-hover:text-[hsl(var(--primary))]" /></div>
    <div className="mt-auto pt-7"><h3 className="font-[family-name:var(--app-font-serif)] text-lg font-bold tracking-tight">{card.title}</h3><p className="mt-1.5 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">{card.description}</p></div>
  </button>;
}

export function FarmHomePage() {
  const [, setLocation] = useLocation();
  const totalCards = groups.reduce((count, group) => count + group.cards.length, 0);
  return <div className="animate-rise space-y-8">
    <PageHeading eyebrow="Boroma Hills · ZW" title="BH Farm OS" detail="Your field book for livestock, crops, water, resources, money, and the work that keeps the farm moving." action={<button type="button" onClick={() => setLocation("/search")} className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-[11px] font-semibold hover:bg-[hsl(var(--secondary))]">Search farm</button>} />
    <Panel className="overflow-hidden"><div className="grid gap-5 bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))] sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="font-mono text-[9px] uppercase tracking-[.18em] text-white/60">Field book</div><h2 className="mt-2 font-[family-name:var(--app-font-serif)] text-3xl font-bold tracking-tight sm:text-4xl">One home for the whole farm.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">Use these cards as the starting point for every part of Boroma Hills. Each card opens the working page where records are created, updated, and reviewed.</p></div><div className="rounded-2xl border border-white/15 bg-white/[.08] px-5 py-4 lg:min-w-[170px]"><div className="font-mono text-[9px] uppercase tracking-[.16em] text-white/55">Working entry points</div><div className="mt-1 font-[family-name:var(--app-font-serif)] text-3xl font-bold">{totalCards}</div><div className="text-[10px] text-white/60">connected farm modules</div></div></div></Panel>
    {groups.map(group => <section key={group.title}><div className="mb-3 flex items-end justify-between gap-4"><div><div className="font-mono text-[9px] uppercase tracking-[.17em] text-[hsl(var(--primary))]">{group.eyebrow}</div><h2 className="mt-1 font-[family-name:var(--app-font-serif)] text-2xl font-bold tracking-tight">{group.title}</h2></div><div className="hidden text-[10px] text-[hsl(var(--muted-foreground))] sm:block">{group.cards.length} modules</div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{group.cards.map(card => <HomeCard key={card.href} card={card} />)}</div></section>)}
    <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><div className="text-[11px] font-bold">System connected</div><div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">Operational records sync through the farm API. This home page is a navigation layer; each module remains responsible for its own data.</div></div><button type="button" onClick={() => setLocation("/alerts")} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-[hsl(var(--primary))]">Check alerts <ArrowRight size={14} /></button></Panel>
  </div>;
}
