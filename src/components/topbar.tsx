"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  BarChart3,
  Brain,
  Menu,
  X,
  ChevronDown,
  Warehouse,
  FileText
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: <Home className="h-4 w-4" />,
    description: "Ringkasan bisnis"
  },
  {
    title: "Penjualan",
    href: "/sales",
    icon: <ShoppingCart className="h-4 w-4" />,
    description: "Kelola penjualan",
    children: [
      {
        title: "Semua Penjualan",
        href: "/sales",
        icon: <ShoppingCart className="h-4 w-4" />
      },
      {
        title: "Penjualan Baru",
        href: "/sales/new",
        icon: <Package className="h-4 w-4" />
      }
    ]
  },
  {
    title: "Produk",
    href: "/products",
    icon: <Package className="h-4 w-4" />,
    description: "Kelola produk & bahan baku"
  },
  {
    title: "BOM",
    href: "/bom",
    icon: <FileText className="h-4 w-4" />,
    description: "Bill of Materials"
  },
  {
    title: "Keuangan",
    href: "/finance",
    icon: <DollarSign className="h-4 w-4" />,
    description: "Kelola keuangan"
  },
  {
    title: "Inventaris",
    href: "/inventory",
    icon: <Warehouse className="h-4 w-4" />,
    description: "Kelola inventaris"
  },
  {
    title: "Payroll",
    href: "/payroll",
    icon: <Users className="h-4 w-4" />,
    description: "Kelola payroll"
  },
  {
    title: "Laporan",
    href: "/reports",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Analisis bisnis"
  },
  {
    title: "AI Assistant",
    href: "/ai",
    icon: <Brain className="h-4 w-4" />,
    description: "Konsultasi AI"
  }
];

export function Topbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const toggleDropdown = (title: string) => {
    setOpenDropdown(openDropdown === title ? null : title);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-green-600 via-blue-500 to-purple-400 bg-clip-text text-transparent">
                MoneyApps
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => (
              <div key={item.title} className="relative">
                {item.children ? (
                  <>
                    <Button
                      variant={isActive(item.href) ? "secondary" : "ghost"}
                      className="h-9 gap-2"
                      onClick={() => toggleDropdown(item.title)}
                    >
                      {item.icon}
                      {item.title}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    {openDropdown === item.title && (
                      <div className="absolute top-full left-0 mt-1 w-48 rounded-md border bg-popover shadow-lg">
                        <div className="p-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setOpenDropdown(null)}
                            >
                              <Button
                                variant="ghost"
                                className={cn(
                                  "w-full justify-start gap-2 h-8 text-sm",
                                  pathname === child.href && "bg-accent"
                                )}
                              >
                                {child.icon}
                                {child.title}
                              </Button>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Link href={item.href}>
                    <Button
                      variant={isActive(item.href) ? "secondary" : "ghost"}
                      className="h-9 gap-2"
                    >
                      {item.icon}
                      {item.title}
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Right side items */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <SignedIn>
              <UserButton />
            </SignedIn>

            <SignedOut>
              <SignInButton>
                <Button size="sm">Sign In</Button>
              </SignInButton>
            </SignedOut>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {menuItems.map((item) => (
                <div key={item.title}>
                  {item.children ? (
                    <div className="space-y-1">
                      <Button
                        variant={isActive(item.href) ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2"
                        onClick={() => toggleDropdown(item.title)}
                      >
                        {item.icon}
                        {item.title}
                        <ChevronDown className="h-3 w-3 ml-auto" />
                      </Button>
                      {openDropdown === item.title && (
                        <div className="ml-4 space-y-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setIsOpen(false)}
                            >
                              <Button
                                variant="ghost"
                                className={cn(
                                  "w-full justify-start gap-2 h-8 text-sm",
                                  pathname === child.href && "bg-accent"
                                )}
                              >
                                {child.icon}
                                {child.title}
                              </Button>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link href={item.href} onClick={() => setIsOpen(false)}>
                      <Button
                        variant={isActive(item.href) ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2"
                      >
                        {item.icon}
                        {item.title}
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}