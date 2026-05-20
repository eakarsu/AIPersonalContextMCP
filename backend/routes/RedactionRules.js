const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'redaction_rules', fields: ['field','rule','reason','status'] });
