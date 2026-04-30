import { useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AuthPanel from "../components/layout/AuthPanel";
import HeroSection from "../components/landing/HeroSection";
import AppCategories from "../components/landing/AppCategories";
import HowItWorks from "../components/landing/HowItWorks";
import CircularsSection from "../components/landing/CircularsSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import QuickLinksSection from "../components/landing/QuickLinksSection";

export default function LandingPage() {
  const [panelMode, setPanelMode] = useState(null);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onOpenPanel={setPanelMode} />
      <main className="flex-1">
        <HeroSection onOpenPanel={setPanelMode} />
        <AppCategories onOpenPanel={setPanelMode} />
        <HowItWorks />
        <CircularsSection />
        <FeaturesSection />
        <QuickLinksSection />
      </main>
      <Footer />
      <AuthPanel mode={panelMode} onClose={() => setPanelMode(null)} onSwitch={setPanelMode} />
    </div>
  );
}
