import { useState, type ReactNode } from 'react';
import {
  Bell,
  CalendarCheck,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CloudSun,
  Construction,
  Egg,
  LayoutDashboard,
  Map,
  Menu,
  Package,
  Search,
  Sprout,
  Tractor,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { getHealthCheckQueryKey, useHealthCheck } from '@workspace/api-client-react';

const nav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/today', label: "Today's work", icon: CalendarCheck },
  { href: '/farm-map', label: 'Farm map', icon: Map },
  { href: '/livestock', label: 'Livestock', icon: Tractor },
  { href: '/crops', label: 'Crops', icon: Sprout },
  { href: '/garden', label: 'Garden', icon: Sprout },
  { href: '/orchard', label: 'Orchard', icon: Sprout },
  { href: '/water', label: 'Water & irrigation', icon: CloudSun },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/sales', label: 'Sales', icon: CircleDollarSign },
  { href: '/expenses', label: 'Expenses', icon: CircleDollarSign },
  { href: '/finance', label: 'Finance', icon: CircleDollarSign },
  { href: '/reports', label: 'Reports', icon: ClipboardList },
  { href: '/equipment', label: 'Equipment', icon: Construction },
];

const developmentFeatures = [
  { title: 'User roles & permissions', description: 'Owner, manager, livestock, crop and worker permissions are the next security layer.' },
  { title: 'Offline-first recording', description: 'Queue farm entries locally and sync them when connectivity returns.' },
  { title: 'Notifications', description: 'Push reminders for health events, water, inventory, harvests and tasks.' },
  { title: 'Reports & exports', description: 'Add printable reports and CSV/PDF exports across operational modules.' },
  { title: 'AI farm assistant', description: 'Prepare a safe read-only intelligence layer over the farm records.' },
  { title: 'IoT sensor integration', description: 'Connect future tank, soil, weather and fish-water sensors.' },
];

function Mark() {
  return <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] shadow-sm"><Sprout size={21} strokeWidth={2.4} /></div>;
}

function Sidebar({ close }: { close?: () => void }) {
  const [location] = useLocation();
  return <aside className="flex h-full w-[258px] flex-col overflow-y-auto bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))]">
    <div className="mb-7 flex items-center gap-3 px-2"><Mark /><div><div className="font-[family-name:var(--app-font-serif)] text-[17px] font-bold tracking-tight">BH Farm OS</div><div className="font-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.56)]">Boroma Hills · ZW</div></div>{close && <button data-testid="button-close-menu" onClick={close} className="ml-auto rounded-lg p-1.5 hover:bg-white/10" aria-label="Close menu"><X size={18} /></button>}</div>
    <div className="mb-2 px-3 font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.45)]">Field book</div>
    <nav className="space-y-1">{nav.map(({ href, label, icon: Icon }) => { const active = href === '/' ? location === '/' : location.startsWith(href); return <Link data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} key={href} href={href} onClick={close} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${active ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-white/[.07] hover:text-[hsl(var(--sidebar-foreground))]'}`}><Icon size={17} strokeWidth={active ? 2.4 : 1.8} /><span>{label}</span>{active && <ChevronRight size={14} className="ml-auto opacity-70" />}</Link>; })}</nav>

    <div className="mt-7 mb-2 px-3 font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.45)]">Records</div>
    <nav className="space-y-1">
      <Link data-testid="link-nav-goats" href="/livestock/goats" onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium ${location.startsWith('/livestock/goats') ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-white/[.07]'}`}><Egg size={17} /><span>Goat register</span></Link>
      <Link data-testid="link-nav-poultry" href="/livestock/poultry" onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium ${location.startsWith('/livestock/poultry') ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-white/[.07]'}`}><CloudSun size={17} /><span>Poultry batches</span></Link>
      <Link data-testid="link-nav-alerts" href="/alerts" onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium ${location.startsWith('/alerts') ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-white/[.07]'}`}><Bell size={17} /><span>Alerts</span></Link>
    </nav>

    <div className="mt-auto pt-6 rounded-2xl border border-white/10 bg-white/[.05] p-3.5"><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold"><span className="h-2 w-2 rounded-full bg-[#82c98b]" />System connected</div><p className="text-[10px] leading-relaxed text-[hsl(var(--sidebar-foreground)/.55)]">Operational records sync through the farm API.</p></div>
  </aside>;
}

function InDevelopment() {
  const [open, setOpen] = useState(false);
  return <div className="fixed bottom-[82px] right-4 z-40 sm:bottom-6 sm:right-6 lg:bottom-6">{open && <div className="mb-3 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.98)] shadow-2xl backdrop-blur-xl"><div className="border-b border-[hsl(var(--border))] p-4"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent)/.2)] text-[hsl(var(--primary))]"><Construction size={18} /></div><div><h2 className="text-sm font-semibold">Next build layer</h2><p className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">Core farm records are now being connected. These are the remaining platform layers.</p></div></div></div><div className="max-h-[min(60vh,430px)] overflow-y-auto p-2">{developmentFeatures.map((feature) => <div key={feature.title} className="rounded-xl p-3 hover:bg-[hsl(var(--muted))]"><div className="text-xs font-semibold">{feature.title}</div><p className="mt-1 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">{feature.description}</p></div>)}</div></div>}<button type="button" data-testid="button-in-development" onClick={() => setOpen((current) => !current)} aria-expanded={open} className={`flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.96)] px-3.5 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-md ${open ? 'ring-2 ring-[hsl(var(--primary)/.15)]' : ''}`}><Construction size={15} className="text-[hsl(var(--primary))]" /><span>Next build layer</span></button></div>;
}

export function FarmShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 60000 } });
  const pageName = location === '/' ? 'Overview' : location.split('/')[1]?.replaceAll('-', ' ') || 'Overview';

  return <div className="grain min-h-[100dvh] bg-[hsl(var(--background))]">
    <div className="fixed inset-y-0 left-0 z-40 hidden lg:block"><Sidebar /></div>
    {menuOpen && <div className="fixed inset-0 z-50 flex lg:hidden"><button data-testid="button-menu-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-[hsl(var(--foreground)/.35)]" /><div className="relative h-full"><Sidebar close={() => setMenuOpen(false)} /></div></div>}
    <div className="lg:pl-[258px]">
      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.93)] px-4 backdrop-blur-md sm:px-7"><div className="flex items-center gap-3"><button data-testid="button-open-menu" onClick={() => setMenuOpen(true)} className="rounded-xl border border-[hsl(var(--border))] p-2 lg:hidden" aria-label="Open menu"><Menu size={19} /></button><div className="hidden items-center gap-2.5 sm:flex"><Mark /><div className="font-[family-name:var(--app-font-serif)] text-[17px] font-bold">Boroma Hills</div><span className="text-[hsl(var(--muted-foreground))]">/</span></div><div className="font-mono text-[10px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">{pageName}</div></div><div className="flex items-center gap-2.5"><Link data-testid="link-header-search" href="/search" className="rounded-xl border border-[hsl(var(--border))] p-2.5 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))]" aria-label="Search"><Search size={18} /></Link><Link data-testid="link-header-alerts" href="/alerts" className="relative rounded-xl border border-[hsl(var(--border))] p-2.5 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))]" aria-label="Alerts"><Bell size={18} /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /></Link><div title={health?.status || 'Connecting'} className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))]">JM</div></div></header>
      <main className="mx-auto max-w-[1460px] px-4 py-5 pb-24 sm:px-7 sm:py-7 lg:px-10 lg:pb-10">{children}</main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[67px] items-center justify-around border-t border-[hsl(var(--border))] bg-[hsl(var(--card)/.96)] px-2 backdrop-blur-md lg:hidden">{[nav[0], nav[1], nav[3], nav[8], nav[9]].map(({ href, label, icon: Icon }) => <Link data-testid={`link-bottom-${label.toLowerCase().replaceAll(' ', '-')}`} key={href} href={href} className={`flex min-w-[52px] flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] ${location === href || (href !== '/' && location.startsWith(href)) ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}><Icon size={19} /><span>{label === "Today's work" ? 'Today' : label}</span></Link>)}</nav>
    <InDevelopment />
  </div>;
}

export function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">{eyebrow}</div><h1 className="font-[family-name:var(--app-font-serif)] text-[30px] font-bold tracking-[-.04em] text-[hsl(var(--foreground))] sm:text-[38px]">{title}</h1>{detail && <p className="mt-1.5 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>}</div>{action}</div>;
}
