import guava1AcreImg from "@/assets/images/solarharvest_guava_1acre_1795493488553.jpg";
import guava3AcreImg from "@/assets/images/solarharvest_guava_3acre_1795493492040.jpg";

export interface WorkDeployment {
  id: string;
  indexLabel: string;
  acreageLabel: string;
  bookingTier: string;
  cropLabel: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  highlights: string[];
}

export const SOLARHARVEST_WORKS: WorkDeployment[] = [
  {
    id: "guava-1-acre",
    indexLabel: "01",
    acreageLabel: "1 Acre",
    bookingTier: "1 Acre Guava Field",
    cropLabel: "Guava Field",
    title: "SolarHarvest — 1 Acre Guava Orchard",
    description:
      "We developed and field-tested the Solar-Powered Smart Irrigation and Fertigation System with AI-Based Pest Detection (SolarHarvest)—integrating solar energy with automated drip irrigation, embedded sensor interfacing, AI pest detection, and Monitoring and Evaluation (M&E) reporting with the Energy Saving Trust.",
    image: guava1AcreImg,
    imageAlt:
      "Realistic field photograph of a 1-acre guava orchard equipped with a solar-powered smart drip irrigation manifold, soil moisture sensor, and AI pest detection camera pole.",
    highlights: [
      "Solar-Powered Drip Irrigation",
      "Automated Fertigation",
      "AI Pest Detection",
      "Energy Saving Trust M&E",
    ],
  },
  {
    id: "guava-3-acre",
    indexLabel: "02",
    acreageLabel: "3 Acres",
    bookingTier: "3 Acre Guava Field",
    cropLabel: "Guava Field",
    title: "SolarHarvest — 3 Acre Guava Orchard",
    description:
      "We developed and field-tested the Solar-Powered Smart Irrigation and Fertigation System with AI-Based Pest Detection (SolarHarvest)—integrating solar energy with automated drip irrigation, embedded sensor interfacing, AI pest detection, and Monitoring and Evaluation (M&E) reporting with the Energy Saving Trust.",
    image: guava3AcreImg,
    imageAlt:
      "Realistic elevated field photograph of a 3-acre commercial guava plantation with a multi-panel solar array, automated fertigation tanks, precision drip lines, and AI pest monitoring camera poles.",
    highlights: [
      "Multi-Panel Solar Array",
      "3-Acre Zone Fertigation",
      "Embedded Sensor Network",
      "Energy Saving Trust M&E",
    ],
  },
];

export interface ExtractedTeamMember {
  email: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  linkedin: string;
}

// Extracted strictly from the previous Vision2Value application (our_team details)
export const EXTRACTED_TEAM_SECTION = {
  eyebrow: "Our Team",
  title: "Brains Behind the Mission",
  description:
    "Meet the talented individuals behind our mission to transform innovation into reality.",
  members: [
    {
      email: "arunsekar.v2v@gmail.com",
      name: "Arun Sekar",
      role: "Founder (Vision & Strategic Leadership)",
      bio: "Provides the overall vision and strategic direction for V2V. Leverages strong industry connections.",
      image: "/team/arun.jpg",
      linkedin: "https://www.linkedin.com/in/arun-sekar-7617b1253/",
    },
    {
      email: "sivaramireddy.v2v@gmail.com",
      name: "Siva Rami Reddy",
      role: "Hardware R&D Lead",
      bio: "Leads the design, development, and prototyping of innovative hardware solutions.",
      image: "/team/sivarami.jpg",
      linkedin: "https://www.linkedin.com/in/sivaramireddy-venna-37a3661a1/",
    },
    {
      email: "mareeswaran.v2v@gmail.com",
      name: "Mareeswaran V",
      role: "Business & Partnerships Lead",
      bio: "Heads business strategy, market engagement, and partnership development.",
      image: "/team/Mareeswaran.jpg",
      linkedin: "https://www.linkedin.com/in/mareeswaran-v-482524306?",
    },
    {
      email: "sivagurunathan.v2v@gmail.com",
      name: "Sivagurunathan",
      role: "Finance & Operations Lead",
      bio: "Manages financial planning, budgeting, and operational efficiency.",
      image: "/team/sivagurunathan.jpg",
      linkedin: "https://www.linkedin.com/in/sivagurunathan-rajasekar-2386bb344/",
    },
    {
      email: "jbavanieswaran.v2v@gmail.com",
      name: "Bavanieswaran J",
      role: "Social Media & Outreach Lead",
      bio: "Leads Brand Communication, digital presence, and outreach initiatives.",
      image: "/team/bavanies.jpg",
      linkedin: "https://www.linkedin.com/in/bavanieswaran-j-2a0621268",
    },
  ] as ExtractedTeamMember[],
};

// Extracted strictly from the previous Vision2Value application (footer_contact details)
export const EXTRACTED_CONTACT_DATA = {
  address: "Tamilnadu, India",
  email: "info.v2vtech@gmail.com",
  phone: "+91 80128 85499",
};
