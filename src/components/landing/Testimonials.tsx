import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Chidinma O.",
    university: "University of Lagos",
    department: "Computer Science",
    content: "jmk helped me find the perfect AI-related project topic and the outline generator saved me weeks of planning. My supervisor was impressed!",
    rating: 5,
  },
  {
    name: "Emeka A.",
    university: "Ahmadu Bello University",
    department: "Mechanical Engineering",
    content: "The department-specific topics are exactly what I needed. No more random searching – every suggestion was relevant to my course.",
    rating: 5,
  },
  {
    name: "Fatima B.",
    university: "University of Ibadan",
    department: "Accounting",
    content: "Premium+ is worth every naira. I uploaded my old project and got a completely refreshed version with updated references. Excellent quality!",
    rating: 5,
  },
  {
    name: "David N.",
    university: "University of Nigeria, Nsukka",
    department: "Law",
    content: "The viva prep questions feature is genius. I felt so prepared for my defense. Got a Distinction!",
    rating: 5,
  },
  {
    name: "Blessing E.",
    university: "Federal University of Technology, Owerri",
    department: "Microbiology",
    content: "Students get better-organized projects and stronger results with jmk. The progress tracker kept me on schedule throughout.",
    rating: 5,
  },
  {
    name: "Yusuf M.",
    university: "Bayero University, Kano",
    department: "Business Administration",
    content: "The citation generator and literature review assistance are game-changers. My project reads so professionally now.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="section-padding bg-muted/50">
      <div className="container-main">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4"
          >
            Testimonials
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-foreground mb-6"
          >
            Students Love jmk
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            Join thousands of Nigerian students who've achieved excellent results with jmk's 
            research assistance and project tools.
          </motion.p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="relative p-6 rounded-2xl bg-card border border-border shadow-card"
            >
              {/* Quote Icon */}
              <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Quote className="w-5 h-5 text-accent" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.department}, {testimonial.university}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
