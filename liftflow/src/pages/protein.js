import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ProteinRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/nutrition");
  }, [router]);

  return null;
}
