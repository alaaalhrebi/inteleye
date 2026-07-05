import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Stats from "@/components/Stats";
import Features from "@/components/Features";
import AISection from "@/components/AISection";
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
      <Testimonials />
      <Footer />
      <AnimatedText>Inteleye</AnimatedText>
    </>
  );
}
