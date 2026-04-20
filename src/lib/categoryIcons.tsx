// =============================================================
// ProductiveDay — Centralised Icon Registry
// =============================================================
// All emoji replaced with Lucide React icons.
// Every category, profession, habit type, and insight
// gets a clean line icon from a single source of truth.
// =============================================================

import {
  Sun, BookOpen, TrendingUp, Settings2, Package, Layers,
  Zap, Sparkles, GraduationCap, Heart, Palette, Users,
  Briefcase, Video, Code2, Target, Dumbbell, Activity,
  Droplets, Wind, Moon, Leaf, PenLine, Music, Brain,
  Lightbulb, TrendingDown, BarChart2, FlaskConical,
  Scale, Building2, Megaphone, HeartPulse, Handshake,
  Microscope, BookMarked, Clapperboard, LayoutDashboard,
  Flame, ShoppingBag, LineChart, LucideIcon,
} from "lucide-react";

// ─── Category → Icon map ──────────────────────────────────────

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Personal:        Sun,
  Learning:        BookOpen,
  Revenue:         TrendingUp,
  Operations:      Settings2,
  Delivery:        Package,
  Product:         Layers,
  "Side Projects": Zap,
  Branding:        Sparkles,
  CIM:             GraduationCap,
  Health:          Heart,
  Creative:        Palette,
  Networking:      Users,
  Strategy:        Target,
  Research:        Microscope,
  Finance:         LineChart,
  Marketing:       Megaphone,
};

// ─── Profession → Icon map ────────────────────────────────────

export const PROFESSION_ICONS: Record<string, LucideIcon> = {
  student:       GraduationCap,
  employee:      Briefcase,
  entrepreneur:  TrendingUp,
  creator:       Clapperboard,
  freelancer:    Palette,
  developer:     Code2,
};

// ─── Industry → Icon map ──────────────────────────────────────

export const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  stem:          FlaskConical,
  business_edu:  BarChart2,
  arts:          Palette,
  medicine:      HeartPulse,
  law:           Scale,
  other_edu:     BookMarked,
  tech:          Code2,
  finance:       LineChart,
  marketing:     Megaphone,
  healthcare:    Heart,
  consulting:    Briefcase,
  other_emp:     Building2,
  software:      Code2,
  design:        Palette,
  media:         Clapperboard,
  ecommerce:     ShoppingBag,
  saas:          LayoutDashboard,
  agency:        Handshake,
  other_ent:     Zap,
  youtube:       Video,
  instagram:     Sparkles,
  tiktok:        Flame,
  podcast:       Megaphone,
  newsletter:    PenLine,
  other_creator: Clapperboard,
  web:           Code2,
  mobile:        Layers,
  backend:       Settings2,
  fullstack:     LayoutDashboard,
  devops:        Package,
  other_dev:     Code2,
};

// ─── Habit icon keys → Icon map ───────────────────────────────

export const HABIT_ICON_KEYS = [
  "dumbbell", "activity", "book", "droplets", "wind",
  "moon", "leaf", "pen", "target", "music", "brain",
  "heart", "flame", "zap", "sun", "users",
] as const;

export type HabitIconKey = typeof HABIT_ICON_KEYS[number];

export const HABIT_ICONS: Record<HabitIconKey, LucideIcon> = {
  dumbbell: Dumbbell,
  activity: Activity,
  book:     BookOpen,
  droplets: Droplets,
  wind:     Wind,
  moon:     Moon,
  leaf:     Leaf,
  pen:      PenLine,
  target:   Target,
  music:    Music,
  brain:    Brain,
  heart:    Heart,
  flame:    Flame,
  zap:      Zap,
  sun:      Sun,
  users:    Users,
};

// ─── Finance insight type → Icon map ─────────────────────────

export const INSIGHT_ICONS: Record<string, LucideIcon> = {
  tip:      Lightbulb,
  up:       TrendingUp,
  down:     TrendingDown,
  chart:    BarChart2,
  savings:  Heart,
  spending: ShoppingBag,
};

// ─── DontDo category → Icon map ──────────────────────────────

export const DONT_DO_ICONS: Record<string, LucideIcon> = {
  health:       HeartPulse,
  productivity: Brain,
  mindset:      Lightbulb,
  social:       Users,
};

// ─── Render helper ─────────────────────────────────────────────
// <CatIcon cat="Health" className="w-3.5 h-3.5" />

interface CatIconProps {
  cat: string;
  className?: string;
  strokeWidth?: number;
}

export function CatIcon({ cat, className = "w-3.5 h-3.5", strokeWidth = 1.75 }: CatIconProps) {
  const Icon = CATEGORY_ICONS[cat] ?? Zap;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

// ─── Icon key → Lucide component (for stored string keys) ────
// Maps the icon key strings stored in plannerData / localStorage
// back to their Lucide components for rendering.

export const ICON_KEY_MAP: Record<string, LucideIcon> = {
  // Category keys
  sun:          Sun,
  book:         BookOpen,
  "trending-up": TrendingUp,
  settings:     Settings2,
  package:      Package,
  layers:       Layers,
  zap:          Zap,
  sparkles:     Sparkles,
  graduation:   GraduationCap,
  heart:        Heart,
  palette:      Palette,
  users:        Users,
  target:       Target,
  microscope:   Microscope,
  // Finance category keys
  briefcase:    Briefcase,
  video:        Video,
  handshake:    Handshake,
  "bar-chart":  BarChart2,
  building:     Building2,
  // Habit keys (same names)
  dumbbell:     Dumbbell,
  activity:     Activity,
  droplets:     Droplets,
  wind:         Wind,
  moon:         Moon,
  leaf:         Leaf,
  pen:          PenLine,
  music:        Music,
  brain:        Brain,
  flame:        Flame,
};

interface IconByKeyProps {
  iconKey: string;
  className?: string;
  strokeWidth?: number;
}

/** Renders a Lucide icon from a stored string key (e.g. "sun", "book"). Falls back to Zap. */
export function IconByKey({ iconKey, className = "w-4 h-4", strokeWidth = 1.75 }: IconByKeyProps) {
  const Icon = ICON_KEY_MAP[iconKey] ?? Zap;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
