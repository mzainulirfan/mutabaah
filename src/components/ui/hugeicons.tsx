"use client";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  FireIcon,
  ChevronRightIcon,
  CheckmarkCircle02Icon,
  UsersIcon,
  SparklesIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  Notification01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  QuoteUpIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
  UserIcon,
  StickyNote02Icon,
  WifiOff01Icon,
  MoreVerticalIcon,
  Delete02Icon,
  Loading03Icon,
  BookOpen02Icon,
  FavouriteIcon,
  Target02Icon,
  ChevronLeftIcon,
  PencilEdit01Icon,
  AlertCircleIcon,
  Calendar01Icon,
  Copy01Icon,
  Download01Icon,
  ViewIcon,
  ViewOffIcon,
  Link02Icon,
  Logout01Icon,
  Mail01Icon,
  MoonIcon,
  SproutIcon,
  Sun03Icon,
  TicketCheckIcon,
  TrophyIcon,
  BarChartIcon,
  CalendarHeartIcon,
  ShieldCheckIcon,
  SmartPhone01Icon,
  Timer01Icon,
  LayoutTable01Icon,
  HeartHandshakeIcon,
  ArrowLeft01Icon,
  CircleDashedIcon,
  Share01Icon,
  File02Icon,
} from "@hugeicons/core-free-icons";
import type { SVGProps } from "react";

// Pembungkus Hugeicons yang kompatibel dengan pemakaian ala Lucide
// (className + aria-*, strokeWidth default 2 seperti Lucide).
function makeIcon(icon: IconSvgElement) {
  return function HIcon({ strokeWidth = 2, ...rest }: SVGProps<SVGSVGElement> & { strokeWidth?: number | string }) {
    return <HugeiconsIcon icon={icon} size={24} strokeWidth={Number(strokeWidth) || 2} {...rest} />;
  };
}

export const Flame = makeIcon(FireIcon);
export const ChevronRight = makeIcon(ChevronRightIcon);
export const CheckCircle2 = makeIcon(CheckmarkCircle02Icon);
export const Users = makeIcon(UsersIcon);
export const Sparkles = makeIcon(SparklesIcon);
export const TrendingUp = makeIcon(TrendingUpIcon);
export const TrendingDown = makeIcon(TrendingDownIcon);
export const Bell = makeIcon(Notification01Icon);
export const X = makeIcon(Cancel01Icon);
export const ArrowRight = makeIcon(ArrowRight01Icon);
export const Quote = makeIcon(QuoteUpIcon);
export const Check = makeIcon(CheckIcon);
export const Minus = makeIcon(MinusIcon);
export const Plus = makeIcon(PlusIcon);
export const User = makeIcon(UserIcon);
export const StickyNote = makeIcon(StickyNote02Icon);
export const WifiOff = makeIcon(WifiOff01Icon);
export const MoreVertical = makeIcon(MoreVerticalIcon);
export const Trash2 = makeIcon(Delete02Icon);
export const Loader2 = makeIcon(Loading03Icon);
export const BookOpen = makeIcon(BookOpen02Icon);
export const Heart = makeIcon(FavouriteIcon);
export const Target = makeIcon(Target02Icon);
export const ChevronLeft = makeIcon(ChevronLeftIcon);
export const Pencil = makeIcon(PencilEdit01Icon);
export const AlertCircle = makeIcon(AlertCircleIcon);
export const CalendarDays = makeIcon(Calendar01Icon);
export const Copy = makeIcon(Copy01Icon);
export const Download = makeIcon(Download01Icon);
export const Eye = makeIcon(ViewIcon);
export const EyeOff = makeIcon(ViewOffIcon);
export const Link2 = makeIcon(Link02Icon);
export const LogOut = makeIcon(Logout01Icon);
export const Mail = makeIcon(Mail01Icon);
export const Moon = makeIcon(MoonIcon);
export const Sprout = makeIcon(SproutIcon);
export const Sun = makeIcon(Sun03Icon);
export const TicketCheck = makeIcon(TicketCheckIcon);
export const Trophy = makeIcon(TrophyIcon);
export const BarChart3 = makeIcon(BarChartIcon);
export const CalendarHeart = makeIcon(CalendarHeartIcon);
export const ShieldCheck = makeIcon(ShieldCheckIcon);
export const Smartphone = makeIcon(SmartPhone01Icon);
export const Timer = makeIcon(Timer01Icon);
export const LayoutTemplate = makeIcon(LayoutTable01Icon);
export const HeartHandshake = makeIcon(HeartHandshakeIcon);
export const ArrowLeft = makeIcon(ArrowLeft01Icon);
export const CircleDashed = makeIcon(CircleDashedIcon);
export const Share = makeIcon(Share01Icon);
export const FileText = makeIcon(File02Icon);
