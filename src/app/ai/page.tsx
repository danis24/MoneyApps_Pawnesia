"use client";

import MoneyAppsAI from "@/components/moneyapps-ai";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain } from "lucide-react";

export default function AIPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8" />
              AI Business Assistant
            </h1>
            <p className="text-muted-foreground mt-2">
              Dapatkan insight dan rekomendasi cerdas untuk bisnis Anda
            </p>
          </div>
        </div>
      </div>

      <MoneyAppsAI />
    </div>
  );
}