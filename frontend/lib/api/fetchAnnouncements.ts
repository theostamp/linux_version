// frontend/lib/api/fetchAnnouncements.ts

export async function fetchAnnouncements() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcements/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 30 }, // optional για cache στο Next 13+ app router
      });
  
      if (!res.ok) {
        throw new Error('Failed to fetch announcements');
      }
  
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }
  }
  