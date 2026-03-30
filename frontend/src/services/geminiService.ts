export const extractSkillsFromCV = async (text: string): Promise<string[]> => {
  // Mocking the AI extraction delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        'React.js',
        'Accessibility (WCAG)',
        'Frontend Development',
        'Problem Solving',
        'Tailwind CSS'
      ]);
    }, 2000);
  });
};
