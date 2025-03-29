import fs from 'fs';
import path from 'path';

const sampleNames = [
  'Bob',
  'John',
  'Alice',
  'Emma',
];

function getRandomName() {
  return sampleNames[Math.floor(Math.random() * sampleNames.length)];
}

function anonymizeData(data) {
  return data.map(item => {
    // Deep clone the item to avoid modifying the original
    const newItem = JSON.parse(JSON.stringify(item));
    
    // Replace author names
    if (newItem.author) {
      newItem.author = getRandomName();
    }
    
    // Replace assignees (if it's an array)
    if (Array.isArray(newItem.assignees)) {
      newItem.assignees = newItem.assignees.map(() => getRandomName());
    }
    // If assignees is a single value
    else if (newItem.assignees) {
      newItem.assignees = getRandomName();
    }
    
    // Replace reviewer author
    if (newItem.reviewAuthor) {
      newItem.reviewAuthor = getRandomName();
    }

    // Replace reviewers array
    if (Array.isArray(newItem.reviewers)) {
      newItem.reviewers = newItem.reviewers.map(() => getRandomName());
    }

    // Replace review comments author and reviewAuthor
    if (Array.isArray(newItem.reviewComments)) {
      newItem.reviewComments = newItem.reviewComments.map(comment => {
        if (comment.author) {
          comment.author = getRandomName();
        }
        if (comment.reviewAuthor) {
          comment.reviewAuthor = getRandomName();
        }
        return comment;
      });
    }
    
    return newItem;
  });
}

// Read the JSON files
const samplesDir = path.join(process.cwd(), 'src', 'samples');
const prsData = JSON.parse(fs.readFileSync(path.join(samplesDir, 'prs.json'), 'utf8'));
const tasksData = JSON.parse(fs.readFileSync(path.join(samplesDir, 'tasks.json'), 'utf8'));

// Anonymize the data
const anonymizedPRs = anonymizeData(prsData);
const anonymizedTasks = anonymizeData(tasksData);

// Write back to files
fs.writeFileSync(path.join(samplesDir, 'prs.json'), JSON.stringify(anonymizedPRs, null, 2));
fs.writeFileSync(path.join(samplesDir, 'tasks.json'), JSON.stringify(anonymizedTasks, null, 2));

console.log('Anonymization complete!'); 