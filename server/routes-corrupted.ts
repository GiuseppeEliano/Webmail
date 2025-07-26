 });

  app.get("/api/search/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const emails = await storage.searchEmails(userId, query);
      res.json(emails);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/counts/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const counts = await storage.getEmailCounts(userId);
      res.json(counts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Storage management routes
  app.get("/api/storage/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const storageInfo = await storage.getUserStorageInfo(userId);
      res.json(storageInfo);
    } catch (error) {
      console.error("Storage info error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/storage/:userId/check", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const canReceive = await storage.canUserReceiveEmails(userId);
      res.json({ canReceive });
    } catch (error) {
      console.error("Storage check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email tag routes
  app.post("/api/emails/:emailId/tags/:tagId", async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const tagId = parseInt(req.params.tagId);
      const success = await storage.addEmailTag(emailId, tagId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/emails/:emailId/tags/:tagId", async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const tagId = parseInt(req.params.tagId);
      const success = await storage.removeEmailTag(emailId, tagId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/emails/:emailId/tags", async (req, res) => {
    try {
      const emailId = parseInt(req.params.emailId);
      const tags = await storage.getEmailTags(emailId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tags/:tagId/emails/:userId", async (req, res) => {
    try {
      const tagId = parseInt(req.params.tagId);
      const userId = parseInt(req.params.userId);
      const emails = await storage.getEmailsByTag(userId, tagId);
      res.json(emails);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tag management routes
  app.get("/api/tags/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const tags = await storage.getTags(userId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const tagData = req.body;
      
      // Check if tag name already exists for this user
      const existingTags = await storage.getTags(tagData.userId);
      const tagExists = existingTags.some(tag => 
        tag.name.toLowerCase() === tagData.name.toLowerCase()
      );
      
      if (tagExists) {
        return res.status(409).json({ message: "Uma tag com este nome já existe" });
      }
      
      // Check if a folder with the same name exists for this user
      const existingFolders = await storage.getFolders(tagData.userId);
      const folderExists = existingFolders.some(folder => 
        folder.name.toLowerCase() === tagData.name.toLowerCase()
      );
      
      if (folderExists) {
        return res.status(409).json({ message: "Já existe uma pasta com este nome" });
      }
      
      const tag = await storage.createTag(tagData);
      res.status(201).json(tag);
    } catch (error) {
      res.status(400).json({ message: "Invalid tag data" });
    }
  });

  app.put("/api/tags/:id", async (req, res) => {
    try {
      const tagId = parseInt(req.params.id);
      const updateData = req.body;
      
      // If updating name, check for conflicts
      if (updateData.name && typeof updateData.name === 'string') {
        const currentTag = await storage.getTag(tagId);
        if (!currentTag) {
          return res.status(404).json({ message: "Tag not found" });
        }
        
        const newName = updateData.name.toLowerCase();
        
        // Check if another tag with this name exists (excluding current tag)
        const existingTags = await storage.getTags(currentTag.userId);
        const tagExists = existingTags.some(tag => 
          tag.id !== tagId && tag.name.toLowerCase() === newName
        );
        
        if (tagExists) {
          return res.status(409).json({ message: "Uma tag com este nome já existe" });
        }
        
        // Check if a folder with the same name exists
        const existingFolders = await storage.getFolders(currentTag.userId);
        const folderExists = existingFolders.some(folder => 
          folder.name.toLowerCase() === newName
        );
        
        if (folderExists) {
          return res.status(409).json({ message: "Já existe uma pasta com este nome" });
        }
      }
      
      const tag = await storage.updateTag(tagId, updateData);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json(tag);
    } catch (error) {
      res.status(400).json({ message: "Invalid tag data" });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    try {
      const tagId = parseInt(req.params.id);
      const success = await storage.deleteTag(tagId);
      if (!success) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Active draft management routes
  app.post("/api/drafts/active/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const draft = await storage.createActiveDraft(userId);
      res.json(draft);
    } catch (error) {
      res.status(500).json({ message: "Failed to create active draft" });
    }
  });

  app.get("/api/drafts/active/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const draft = await storage.getActiveDraft(userId);
      if (!draft) {
        return res.status(404).json({ message: "No active draft found" });
      }
      res.json(draft);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/drafts/active/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      await storage.clearActiveDraft(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Alias routes
  app.get("/api/aliases/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const aliases = await storage.getAliases(userId);
      res.json(aliases);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/alias/:id", async (req, res) => {
    try {
      const aliasId = parseInt(req.params.id);
      const alias = await storage.getAlias(aliasId);
      if (!alias) {
        return res.status(404).json({ message: "Alias not found" });
      }
      res.json(alias);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/aliases", async (req, res) => {
    try {
      const aliasData = insertAliasSchema.parse(req.body);
      const alias = await storage.createAlias(aliasData);
      res.status(201).json(alias);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/alias/:id", async (req, res) => {
    try {
      const aliasId = parseInt(req.params.id);
      const updateData = updateAliasSchema.parse(req.body);
      const alias = await storage.updateAlias(aliasId, updateData);
      if (!alias) {
        return res.status(404).json({ message: "Alias not found" });
      }
      res.json(alias);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/alias/:id", async (req, res) => {
    try {
      const aliasId = parseInt(req.params.id);
      const deleted = await storage.deleteAlias(aliasId);
      if (!deleted) {
        return res.status(404).json({ message: "Alias not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/alias/:id/toggle", async (req, res) => {
    try {
      const aliasId = parseInt(req.params.id);
      const alias = await storage.toggleAliasStatus(aliasId);
      if (!alias) {
        return res.status(404).json({ message: "Alias not found" });
      }
      res.json(alias);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
