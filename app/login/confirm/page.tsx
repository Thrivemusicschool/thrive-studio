import Link from 'next/link'

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-6">📬</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-500 text-sm mb-1">We sent a login link to</p>
        {email && (
          <p className="font-medium text-gray-800 text-sm mb-6">{email}</p>
        )}
        <p className="text-gray-400 text-xs mb-8">
          Click the link in the email to sign in. It expires in 1 hour.
        </p>
        <Link
          href="/login"
          className="text-sm text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
        >
          Use a different email
        </Link>
      </div>
    </main>
  )
}
