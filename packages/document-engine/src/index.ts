import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import { exec } from 'child_process';
import { promisify } from 'util';
import { type CandidateProfile } from '@careertwin/schemas';

const execAsync = promisify(exec);

export class DocumentEngine {
  constructor(private templatesDir: string) {}

  async generateResume(
    profile: CandidateProfile, 
    templateName: 'ats-safe' | 'startup' = 'ats-safe',
    outputPath: string
  ): Promise<string> {
    const templatePath = path.join(this.templatesDir, `resumes/${templateName}.tex`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    
    const template = Handlebars.compile(templateContent);
    const texSource = template(profile);

    const tempDir = path.join(process.cwd(), 'cache', 'latex');
    await fs.ensureDir(tempDir);
    
    const texFile = path.join(tempDir, `resume-${Date.now()}.tex`);
    await fs.writeFile(texFile, texSource);

    try {
      // Try compiling with tectonic
      const { stdout, stderr } = await execAsync(`tectonic ${texFile} -o ${path.dirname(outputPath)}`);
      const pdfFile = path.join(path.dirname(outputPath), path.basename(texFile, '.tex') + '.pdf');
      
      // Rename to final output path
      await fs.move(pdfFile, outputPath, { overwrite: true });
      return texSource;
    } catch (error: any) {
      console.warn('Tectonic compilation failed or not found. Persisting .tex source instead.', error.message);
      // Fallback: Just return the source if compilation fails
      const texOutputPath = outputPath.replace('.pdf', '.tex');
      await fs.writeFile(texOutputPath, texSource);
      throw new Error(`LaTeX compilation failed: ${error.message}`);
    }
  }
}
