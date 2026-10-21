import { createElement } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartColumn,
  Circle,
  ClipboardList,
  Columns3,
  Download,
  FileText,
  GraduationCap,
  House,
  Info,
  KeyRound,
  Mail,
  Megaphone,
  MessageSquare,
  PencilLine,
  Presentation,
  Receipt,
  Settings,
  SquareDot,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/** Ikon yang dapat dipilih pada kolom `menu.ikon` di database. */
const MENU_ICONS: Record<string, LucideIcon> = {
  Bell,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Columns3,
  Download,
  FileText,
  GraduationCap,
  House,
  Info,
  KeyRound,
  Mail,
  Megaphone,
  MessageSquare,
  PencilLine,
  Presentation,
  Receipt,
  Settings,
  SquareDot,
  UserRound,
  Users,
  Wallet,
};

/** Ikon menu berdasarkan nama yang disimpan di kolom `menu.ikon`; ikon tak dikenal memakai lingkaran. */
export function MenuIcon({ ikon, ...props }: { ikon: string | null } & Omit<LucideProps, "ref">) {
  return createElement((ikon && MENU_ICONS[ikon]) || Circle, props);
}
