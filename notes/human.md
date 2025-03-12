## Human notes

we should store documents at this granularity:

- session document, useDocument without _id specified, then merge() the user's first message in as `prompt` and type == 'session', useDocument save() as chatinput handler from home.tsx
  - the form should be disabled until the first ai message markdown segment has length > 0 (we should make an event for this on useSimpleChat)
- when the title comes back, save the title to the session document
- when the ai messages complete, save them to new documents with doc.session_id = session_id, doc.rawMessage = final message string, doc.type = 'ai-message'
- subsequent user prompts should be stored to new documents with doc.session_id = session_id, doc.prompt = user prompt, doc.type = 'user-message'
- save the screenshot to a new document with doc.session_id = session_id, doc.title = title, and screenshot in doc._files like it is now
- all docs should have created_at = Date.now() - move away from timestamp
- database.put makes sense for most of these, but useDocument makes sense for the session document 
