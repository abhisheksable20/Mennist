import EchoContext from "../../context/posts/echoContext";
import { useState, useRef } from "react";
import axios from "axios";

const EchoState = (props) => {
    const [echoes, setEchoes] = useState([])
    const [hasNext, setHasNext] = useState(true);
    const [loading, setLoading] = useState(false);
    
    const lastTimestampRef = useRef(Date.now());
    const abortControllerRef = useRef(null);

    const PAGE_SIZE = 10;

    // Fetch user echoes from the server
    const fetchUserEchoes = async () => {
        setLoading(true);

        if (abortControllerRef.current)
            abortControllerRef.current.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const data = (await axios.get(`${process.env.REACT_APP_API_URL}/echoes?endAt=${lastTimestampRef.current - 1}`, { signal: controller.signal })).data;
            setEchoes((prev) => [...prev, ...data.echoesData]);
            lastTimestampRef.current = data.lastTimestamp;
            // No new posts to fetch stop here
            if (data.echoesData.length < PAGE_SIZE) {
                setHasNext(false);
            }
        }
        catch (fetchError) {
            if (axios.isCancel(fetchError)) return;
            console.log("Fetching error: ", fetchError)
            setHasNext(false);
            throw fetchError
        }
        finally {
            setLoading(false)
        }
    }

    return (
        <EchoContext.Provider value={{
            hasNext, loading, echoes, fetchUserEchoes
        }}>
            {props.children}
        </EchoContext.Provider>
    )
}


export default EchoState;