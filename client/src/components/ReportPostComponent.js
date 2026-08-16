import React from 'react'
import "../styles/ReportModal.css"
import reportFillSVG from "../assets/report_fill_svg.svg"
import { useState, useRef } from 'react';
import axios from 'axios';

function ReportPostComponent(props) {
  const { reportBtnRef, chatId, postId } = props;
  const closeReportRef = useRef(null);
  const [selectedMsg, setSelectedMsg] = useState("");
  const [isDisable, setDisablity] = useState(false);

  // Report the post
  const reportPost = async () => {
    if (!chatId || selectedMsg.length <= 0 || !postId) {
      props.alert("Tell us why you're reporting this", "alert")
      return;
    }

    const data = {
      postId: postId,
      reason: selectedMsg,
      postOwnerChatId: chatId
    }

    try {
      setDisablity(true);
      await axios.post(`${process.env.REACT_APP_API_URL}/report`, data);
      props.alert("Thanks for helping keep Mennist safe.", "success");
    }
    catch (reportErr) {
      props.alert("Something went wrong!", "alert");
    }
    finally {
      setDisablity(false);
      closeReportRef.current.click();
    }

  }

  return (
    <div>
      <button ref={reportBtnRef} type="button" className="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#exampleModal">
        Launch report modal
      </button>

      <div className="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h6 className="modal-title d-flex align-items-center gap-2" id="exampleModalLabel">
                <img className='report-icon' src={reportFillSVG} alt='Report Icon' width="28px" height="28px" />
                Report this post
              </h6>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <small className='report-msg'>Why are you reporting this post? Your report is <br /> anonymous.</small>
              {/* Report Options */}
              {/* Harmful or dangerous content */}
              <div className="form-check mt-4 mb-3">
                <input
                  className="form-check-input"
                  type="radio"
                  name="radioDefault"
                  id="harmful"
                  value={"Harmful or dangerous content"}
                  onChange={(e) => setSelectedMsg(e.target.value)} />
                <label className="form-check-label" htmlFor="harmful">
                  Harmful or dangerous content
                </label>
              </div>
              {/* Spam or misleading */}
              <div className="form-check my-3">
                <input
                  className="form-check-input"
                  type="radio"
                  name="radioDefault"
                  id="spam"
                  value={"Spam or misleading"}
                  onChange={(e) => setSelectedMsg(e.target.value)} />
                <label className="form-check-label" htmlFor="spam">
                  Spam or misleading
                </label>
              </div>
              {/* Hate speech or harassment */}
              <div className="form-check my-3">
                <input
                  className="form-check-input"
                  type="radio"
                  name="radioDefault"
                  id="hate"
                  value={"Hate speech or harassment"}
                  onChange={(e) => setSelectedMsg(e.target.value)} />
                <label className="form-check-label" htmlFor="hate">
                  Hate speech or harassment
                </label>
              </div>
              {/* Explicit or inappropriate content */}
              <div className="form-check my-3">
                <input
                  className="form-check-input"
                  type="radio"
                  name="radioDefault"
                  id="explicit"
                  value={"Explicit or inappropriate content"}
                  onChange={(e) => setSelectedMsg(e.target.value)} />
                <label className="form-check-label" htmlFor="explicit">
                  Explicit or inappropriate content
                </label>
              </div>
              {/* Something else */}
              <div className="form-check mb-4 mt-3">
                <input
                  className="form-check-input"
                  type="radio"
                  name="radioDefault"
                  id="else"
                  value={"Something else"}
                  onChange={(e) => setSelectedMsg(e.target.value)} />
                <label className="form-check-label" htmlFor="else">
                  Something else
                </label>
              </div>
              {/* Contact Email */}
              {/* Contact Email */}
              <div className="report-contact">
                <span>Need help with something else?</span>
                <a href="mailto:vibetalks@mennist.com">
                  vibetalks@mennist.com
                </a>
              </div>
            </div>
            <div className="d-flex modal-footer">
              <button ref={closeReportRef} type="button" className="btn w-50" data-bs-dismiss="modal" style={{ background: "#FAFAFA", color: "#0D0D0D" }}>Close</button>
              <button type="button" className="btn w-50" style={{ background: "#D0342C", color: "#FAFAFA" }} onClick={reportPost} disabled={isDisable}>Submit Report</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportPostComponent
