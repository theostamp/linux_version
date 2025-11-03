// components/ErrorMessage.tsx

export default function ErrorMessage({ message }: { readonly message: string }) {
    return (
      <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-xl mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2">⚠️ Κάτι πήγε στραβά</h2>
        <p>{message}</p>
      </div>
    );
  }
  