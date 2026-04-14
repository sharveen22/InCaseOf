import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Story from "@/components/landing/Story";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Story />
      <FAQ />
      <Footer />
    </main>
  );
}
