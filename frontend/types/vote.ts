export type Vote = {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  building: number;
  choices: string[];
  total_votes?: number; // Total number of votes cast
};
