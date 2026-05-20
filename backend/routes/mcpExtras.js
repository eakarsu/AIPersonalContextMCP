// routes/mcpExtras.js — dynamic MCP server config snippet
const express=require('express');
const router=express.Router();
router.get('/mcp/config', (req,res)=>{
  const port=process.env.BACKEND_PORT||4063;
  res.json({
    mcpServers: {
      'personal-context': {
        command: 'node',
        args: ['~/.personal-mcp/server.js'],
        env: { PERSONAL_CONTEXT_URL: 'http://localhost:'+port }
      }
    }
  });
});
module.exports=router;