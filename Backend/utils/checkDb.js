require('dotenv').config();
const { sequelize } = require('../config/database');

(async () => {
  try {
    await sequelize.authenticate();
    const [rows] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position"
    );
    console.log('\n── users table columns ──');
    rows.forEach(r => console.log(`  ${r.column_name}  (${r.data_type})`));
    await sequelize.close();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
