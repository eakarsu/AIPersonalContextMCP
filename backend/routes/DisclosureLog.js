const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'disclosure_log', fields: ['app_name','fields_disclosed','purpose','disclosed_at'] });
