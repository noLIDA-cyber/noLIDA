const { query } = require('./server/config/database');

async function inspect() {
  try {
    const countResult = await query('SELECT COUNT(*) as count FROM authorization_codes');
    console.log('authorization_codes count:', countResult.rows[0].count);

    const columnsResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'authorization_codes'
      ORDER BY ordinal_position
    `);
    console.log('\nauthorization_codes columns:');
    columnsResult.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`);
    });

    const usageColumnsResult = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'authorization_code_usage'
      ORDER BY ordinal_position
    `);
    console.log('\nauthorization_code_usage columns:');
    usageColumnsResult.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type}`);
    });

    const permResult = await query(`
      SELECT slug FROM permissions
      WHERE slug LIKE 'authorization_codes%' OR slug LIKE 'business%'
      ORDER BY slug
    `);
    console.log('\nExisting relevant permissions:');
    permResult.rows.forEach(r => console.log(`  ${r.slug}`));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

inspect();
