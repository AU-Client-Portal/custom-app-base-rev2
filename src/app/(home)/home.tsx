import { copilotApi } from 'copilot-node-sdk';
import { GA4Dashboard } from '@/app/components/GA4Dashboard';
import { TokenGate } from '@/components/TokenGate';
import { Container } from '@/components/Container';

export const revalidate = 180;

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const { token } = searchParams;
  const copilot = copilotApi({
    apiKey: process.env.COPILOT_API_KEY ?? '',
    token: typeof token === 'string' ? token : undefined,
  });

  const workspace = await copilot.retrieveWorkspace();
  
  return (
    <Container>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">View your website analytics below</p>
        </div>
        
        <GA4Dashboard />
      </div>
    </Container>
  );
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <TokenGate searchParams={searchParams}>
      <Content searchParams={searchParams} />
    </TokenGate>
  );
}
