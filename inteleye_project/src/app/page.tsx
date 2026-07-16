import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Stats from "@/components/Stats";
import Features from "@/components/Features";
import AISection from "@/components/AISection";
import Pricing from "@/components/Pricing/Pricing";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";
import AnimatedText from "@/components/AnimatedText";

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <Stats />
      <Features />
      <AISection />
      <Pricing />
      <Testimonials />
      <Footer />
<AnimatedText>IntelEye</AnimatedText> 
    </>
  );
}
