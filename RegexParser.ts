/**
 * A browser-compatible event emitter and parser for streaming content.
 * This replaces the Node.js stream-based implementation to work in browsers.
 */
export class RegexParser {
  private buffer: string = '';
  private readonly regex: RegExp;

  // Chat-specific state tracking
  public inCodeBlock: boolean = false; // Make this public so useChat can access it
  private backtickCount: number = 0;
  private languageId: string = '';
  private inDependencyMode: boolean = true; // Start in dependency mode by default
  private dependencyContent: string = '';

  // Public properties that can be accessed directly
  public dependencies: Record<string, string> = {};
  public displayText: string = '';
  public codeBlockContent: string = ''; // Make code content public
  public codeBlockValid: boolean = true; // Track if code block starts with import

  // Event handling
  private eventHandlers: Record<string, Function[]> = {
    text: [],
    code: [],
    dependencies: [],
    match: [],
    codeUpdate: [], // Add codeUpdate event type
    codeBlockStart: [], // Add codeBlockStart event type
    codeBlockValidation: [], // Add validation event type
  };

  /**
   * Creates a new RegexParser instance.
   * @param regex - The regular expression pattern to match against incoming data.
   */
  constructor(regex?: RegExp) {
    // If regex is provided, create a clone to avoid modifying the original
    if (regex) {
      this.regex = new RegExp(regex.source, regex.flags);

      // Ensure the regex doesn't have the 'g' flag to avoid stateful regex issues
      if (this.regex.global) {
        throw new Error('RegexParser does not support regexes with the global flag (g)');
      }
    } else {
      // Default regex that matches nothing if none provided
      this.regex = new RegExp('(?!)');
    }
  }

  /**
   * Add an event listener
   * @param event - Event name to listen for
   * @param callback - Function to call when event occurs
   */
  on(event: string, callback: Function): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    Object.keys(this.eventHandlers).forEach((event) => {
      this.eventHandlers[event] = [];
    });
  }

  /**
   * Emit an event to all listeners
   * @param event - Event name to emit
   * @param args - Arguments to pass to listeners
   */
  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers[event] || [];
    handlers.forEach((handler) => handler(...args));
  }

  /**
   * Process a chunk of data
   * @param chunk - Text chunk to process
   */
  write(chunk: string): void {
    // Simple debug logging of input chunk
    console.debug(`- ${chunk.replace(/\n/g, '\\n')}`);

    // Process the chunk for chat-specific parsing
    this._processChatChunk(chunk);

    // If using regex matching, also process that
    if (this.regex.source !== '(?!)') {
      // Append new data to existing buffer
      this.buffer += chunk;

      // Process all complete matches in the buffer
      this._processRegexBuffer();
    }
  }

  /**
   * Signal the end of the stream
   */
  end(): void {
    // Emit any final dependencies if we were in dependency mode
    if (this.inDependencyMode && Object.keys(this.dependencies).length > 0) {
      this.emit('dependencies', this.dependencies);
      this.inDependencyMode = false;
    }

    // Emit any final code if we were in a code block
    if (this.inCodeBlock && this.codeBlockContent) {
      this.emit('code', this.codeBlockContent, this.languageId);
      this.inCodeBlock = false;
    }

    // Push any remaining content in the buffer
    if (this.buffer.length > 0) {
      this.emit('text', this.buffer, this.displayText + this.buffer);
      this.buffer = '';
    }

    // Log final state
    console.debug('Final state:', {
      dependencies: this.dependencies,
      displayText: this.displayText,
      codeBlockContent: this.codeBlockContent,
    });
  }

  /**
   * Process the current buffer to find and handle regex matches.
   * @private
   */
  private _processRegexBuffer(): void {
    let match: RegExpExecArray | null;

    while ((match = this.regex.exec(this.buffer)) !== null) {
      // Get content before match
      const beforeMatch = this.buffer.slice(0, match.index);
      if (beforeMatch) {
        this.emit('text', beforeMatch, this.displayText + beforeMatch);
        this.displayText += beforeMatch;
      }

      // Emit the match as a special event
      this.emit('match', match[0], match);

      // Update buffer to contain only content after this match
      this.buffer = this.buffer.slice(match.index + match[0].length);
    }

    // Log regex matches
    console.debug('Regex matches:', match);
  }

  /**
   * Process a chunk specifically for chat UI needs (code blocks, dependencies, etc.)
   * @private
   */
  private _processChatChunk(chunk: string): void {
    // Log state changes
    console.debug('Processing chat chunk:', chunk);

    // If in dependency mode, handle specially
    if (this.inDependencyMode) {
      this.dependencyContent += chunk;

      // Check if this chunk contains the end of dependency declaration
      if (this.dependencyContent.includes('}}')) {
        const endIndex = this.dependencyContent.indexOf('}}') + 2;
        const dependencyPart = this.dependencyContent.substring(0, endIndex);
        const afterJson = this.dependencyContent.substring(endIndex);

        // Extract dependencies using regex
        const matches = dependencyPart.match(/"([^"]+)"\s*:\s*"([^"]+)"/g);
        if (matches) {
          matches.forEach((match) => {
            const keyMatch = match.match(/"([^"]+)"\s*:/);
            const valueMatch = match.match(/:\s*"([^"]+)"/);

            if (keyMatch?.[1] && valueMatch?.[1]) {
              const key = keyMatch[1].trim();
              const value = valueMatch[1].trim();

              // Skip empty keys and values
              if (key && value) {
                this.dependencies[key] = value;
              }
            }
          });
        }

        // Emit dependencies event with all collected dependencies
        console.debug(`Dependencies detected: ${JSON.stringify(this.dependencies)}`);
        this.emit('dependencies', this.dependencies);

        // Exit dependency mode permanently
        console.debug(
          `Exiting dependency mode. Remaining text: "${afterJson.substring(0, 20)}..."`
        );
        this.inDependencyMode = false;
        this.dependencyContent = '';

        // Process remaining content if any
        if (afterJson.trim()) {
          this._processDisplayText(afterJson);
        }
      }

      return;
    }

    // Process as normal text/code if we're not in dependency mode
    this._processDisplayText(chunk);
  }

  /**
   * Process text for display, handling code blocks specially
   * @private
   */
  private _processDisplayText(text: string): void {
    let currentDisplayText = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '`') {
        this.backtickCount++;
        if (this.backtickCount === 3) {
          if (!this.inCodeBlock) {
            // Start of code block
            this.inCodeBlock = true;
            this.backtickCount = 0;
            // Reset code block content when starting a new code block
            this.codeBlockContent = '';
            i = this._skipLanguageIdentifier(text, i + 1);

            // Emit an event when a code block starts
            this.emit('codeBlockStart');
          } else {
            // End of code block
            this.inCodeBlock = false;
            this.backtickCount = 0;

            // Ensure code block starts with import
            if (this.codeBlockContent && !this.codeBlockContent.trim().startsWith('import')) {
              // Find the first occurrence of 'import' in the code block
              const importIndex = this.codeBlockContent.indexOf('import');
              if (importIndex !== -1) {
                // Keep only the content starting from 'import'
                this.codeBlockContent = this.codeBlockContent.substring(importIndex);
                console.debug('Code block adjusted to start with import statement');
              } else {
                console.debug('Warning: Code block does not contain any import statement');
              }
            }

            // Emit the completed code block
            this.emit('code', this.codeBlockContent, this.languageId);
          }
        }
      } else if (this.backtickCount > 0) {
        if (this.inCodeBlock) {
          this.codeBlockContent += '`'.repeat(this.backtickCount) + char;
        } else {
          currentDisplayText += '`'.repeat(this.backtickCount) + char;
        }
        this.backtickCount = 0;
      } else {
        if (this.inCodeBlock) {
          this.codeBlockContent += char;
          // Only log code updates periodically to avoid console spam
          if (this.codeBlockContent.length % 200 === 0) {
            console.debug(`> Code progress: ${this.codeBlockContent.length} chars`);
          }
          // Emit code update event for streaming
          this.emit('codeUpdate', this.codeBlockContent);
        } else {
          currentDisplayText += char;
        }
      }
    }

    // Emit any display text we've accumulated
    if (currentDisplayText) {
      this.displayText += currentDisplayText;
      this.emit('text', currentDisplayText, this.displayText);
    }

    // Log text processing
    console.debug('Processed display text:', currentDisplayText);
  }

  /**
   * Skip language identifier after code block start
   * @private
   */
  private _skipLanguageIdentifier(text: string, startIndex: number): number {
    let j = startIndex;
    while (j < text.length && text[j] !== '\n') {
      j++;
    }

    if (j < text.length) {
      // Extract language ID, trim whitespace, and remove any trailing colon
      const rawLanguageId = text.substring(startIndex, j).trim();
      this.languageId = rawLanguageId.replace(/:(\s*)$/, '').trim();
      return j; // Skip to after the newline
    }

    return startIndex; // Couldn't find newline, just return the start
  }

  /**
   * Reset the parser state
   */
  public reset(): void {
    this.buffer = '';
    this.inCodeBlock = false;
    this.codeBlockContent = '';
    this.backtickCount = 0;
    this.languageId = '';
    this.inDependencyMode = true; // Reset to start in dependency mode
    this.dependencyContent = '';
    this.dependencies = {};
    this.displayText = ''; // Reset displayText as well
    this.codeBlockValid = true; // Reset code block validation
  }
}
