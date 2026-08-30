const { query } = require('../config/database');

const seedCategories = async () => {
  const categories = [
    { name: 'Barbers', slug: 'barbers', description: 'Professional haircuts and grooming services.', icon: '💈' },
    { name: 'Beauty & Makeup', slug: 'beauty', description: 'Makeup artists, beauty professionals, and skincare.', icon: '💄' },
    { name: 'Photographers', slug: 'photographers', description: 'Event, portrait, and commercial photography.', icon: '📸' },
    { name: 'Plumbers', slug: 'plumbers', description: 'Installation, repair, and maintenance of plumbing systems.', icon: '🔧' },
    { name: 'Electricians', slug: 'electricians', description: 'Electrical installation, repair, and maintenance.', icon: '⚡' },
    { name: 'Cleaners', slug: 'cleaners', description: 'Home, office, and commercial cleaning services.', icon: '🧹' },
    { name: 'Mechanics', slug: 'mechanics', description: 'Auto repair, maintenance, and diagnostics.', icon: '🔩' },
    { name: 'Tutors', slug: 'tutors', description: 'Academic tutoring and educational support.', icon: '📚' },
    { name: 'Freelancers', slug: 'freelancers', description: 'Designers, writers, developers, and creatives.', icon: '💻' },
    { name: 'Restaurants', slug: 'restaurants', description: 'Dining, delivery, and catering services.', icon: '🍽️' },
    { name: 'Hotels', slug: 'hotels', description: 'Accommodation, hospitality, and stays.', icon: '🏨' },
    { name: 'Event Vendors', slug: 'events', description: 'Venues, planners, decorators, and event services.', icon: '🎉' },
    { name: 'Fitness', slug: 'fitness', description: 'Personal trainers, gyms, and wellness coaches.', icon: '🏋️' },
    { name: 'Rentals', slug: 'rentals', description: 'Equipment, property, and vehicle rentals.', icon: '🚗' },
    { name: 'Health', slug: 'health', description: 'Doctors, clinics, and healthcare services.', icon: '🏥' },
  ];

  for (const cat of categories) {
    await query(
      `INSERT INTO categories (name, slug, description, icon, sort_order, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon`,
      [cat.name, cat.slug, cat.description, cat.icon, 0, true]
    );
  }

  console.log(`Seeded ${categories.length} categories`);
};

const seedCapabilities = async () => {
  const capabilities = [
    { categorySlug: 'barbers', name: 'Haircut', slug: 'haircut', description: 'Standard haircut service.' },
    { categorySlug: 'barbers', name: 'Beard Trim', slug: 'beard-trim', description: 'Beard shaping and trimming.' },
    { categorySlug: 'photographers', name: 'Event Photography', slug: 'event-photography', description: 'Full event coverage.' },
    { categorySlug: 'photographers', name: 'Portrait Session', slug: 'portrait-session', description: 'Professional portrait shoot.' },
    { categorySlug: 'plumbers', name: 'Pipe Repair', slug: 'pipe-repair', description: 'Leak detection and pipe repair.' },
    { categorySlug: 'plumbers', name: 'Installation', slug: 'installation', description: 'Fixture and appliance installation.' },
    { categorySlug: 'cleaners', name: 'Home Cleaning', slug: 'home-cleaning', description: 'Residential cleaning service.' },
    { categorySlug: 'cleaners', name: 'Office Cleaning', slug: 'office-cleaning', description: 'Commercial office cleaning.' },
    { categorySlug: 'tutors', name: 'Math Tutoring', slug: 'math-tutoring', description: 'Mathematics tuition and support.' },
    { categorySlug: 'tutors', name: 'Language Lessons', slug: 'language-lessons', description: 'Language learning sessions.' },
  ];

  for (const cap of capabilities) {
    const catResult = await query('SELECT id FROM categories WHERE slug = $1', [cap.categorySlug]);
    if (catResult.rows.length === 0) continue;

    await query(
      `INSERT INTO capabilities (category_id, name, slug, description, active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
      [catResult.rows[0].id, cap.name, cap.slug, cap.description, true]
    );
  }

  console.log(`Seeded ${capabilities.length} capabilities`);
};

const runSeeds = async () => {
  await seedCategories();
  await seedCapabilities();
  console.log('Seeds complete');
  process.exit(0);
};

runSeeds().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});