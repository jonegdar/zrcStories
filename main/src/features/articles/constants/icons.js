import {
  Archive,
  BookMarked,
  GraduationCap,
  LayoutGrid,
  Megaphone,
  MessageCircleHeart,
  Sparkles,
  UserRound,
} from "lucide-react";

export const ARTICLE_CATEGORY_ICONS = {
  All: LayoutGrid,
  "School Announcements": Megaphone,
  "SHC announcements": GraduationCap,
  "Student Announcements": Sparkles,
  Promotions: MessageCircleHeart,
  "Resources & Opportunities": BookMarked,
  "Lost & Found": Archive,
};

export const ARTICLE_DETAIL_CATEGORY_ICONS = {
  ...ARTICLE_CATEGORY_ICONS,
  "SHC announcements": UserRound,
};
