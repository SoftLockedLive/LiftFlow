export default function ProteinRedirect() {
  return null;
}

export function getServerSideProps() {
  return {
    redirect: {
      destination: "/nutrition",
      permanent: true,
    },
  };
}
