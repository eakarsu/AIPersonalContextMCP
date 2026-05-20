const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'schemas', fields: ['name','fields_summary','version','status'] });
