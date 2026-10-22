import EchoPostItem from "./EchoPostItem"
import { useEffect, useState, useContext } from 'react'
import EchoContext from "../../context/posts/echoContext";
import useInfiniteScroll from "react-infinite-scroll-hook";
import { useNavigate } from 'react-router-dom';
import Spinner from '../Spinner';
import NoContent from '../NoContent';
import PostHeaders from "../utils/PostHeaders";

function EchoesComponent(props) {
    const { hasNext, loading, echoes, fetchUserEchoes } = useContext(EchoContext);

    const navigate = useNavigate();

    const loadEchoes = async () => {
        try {
            await fetchUserEchoes();
        }
        catch (loadingError) {
            // Check wheather the session is expired
            if (loadingError.response && loadingError.response.status === 401) {
                props.alert("Please start a new session.", "alert");
                navigate("/setup-user");
                return;
            }
        }
    }


    useEffect(() => {
        document.title = "Echoes"
        loadEchoes();
    }, [])

    // Infinite scroll hook
    const [sentryRef] = useInfiniteScroll({
        loading,
        hasNextPage: hasNext,
        onLoadMore: loadEchoes,
        disabled: loading,
        rootMargin: '0px 0px 300px 0px'
    });

    return (
        <div className="container my-5 posts-container">
            <PostHeaders splText={"LATEST ECHOES"} heading={"Share Your Echo, Secretly!"} subHeading={"Your dreams, your stories."}/>

            {/* Echo Items */}
            {loading && echoes.length === 0 ? (
                <Spinner />
            ) : echoes.length === 0 ? (
                <NoContent
                    svgType={1}
                    title="NO ECHOES YET"
                    text="Leave an echo and you might find someone thinking the same thing."
                />
            ) : (
                <div className="row g-5">
                    {echoes.map(echo => (
                        <EchoPostItem key={echo.id} echo={echo} />
                    ))}
                </div>
            )}

            {/* Sentinel — always render this at the bottom */}
            {loading && echoes.length > 0 && <Spinner />}
            {hasNext && <div ref={sentryRef} />}
        </div>
    )
}

export default EchoesComponent
