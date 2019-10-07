import { useState, useEffect } from "react";

function useFetch(url) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function handleError(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
  };

  async function fetchUrl(url) {
    try {
      const response = await fetch(url);
      await handleError(response);
      const json = await response.json();
      setData(json);
      setLoading(false);
    } catch (error_msg) {
      setError(error_msg);
      setLoading(false)
    }
  }
  useEffect(() => {
    fetchUrl(url);
  }, [url]);
  return [data, loading, error];
}

export { useFetch };