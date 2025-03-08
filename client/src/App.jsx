import { useEffect, useReducer, useRef, useMemo, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { io } from 'socket.io-client';

function App() {
  const socket = useMemo(
    () =>
      io("http://localhost:3000", {
        withCredentials: true,
      }),
    []
  );

  const localVideoRef = useRef()
  const remoteVideoRef = useRef()
  const pc = useRef(new RTCPeerConnection(null))
  const textRef = useRef()
  const senders = useRef([]);

  const [offerVisible, setOfferVisible] = useState(true)
  const [answerVisible, setAnswerVisible] = useState(false)
  const [status, setStatus] = useState('Make a call now')
  
  useEffect(() => {
    socket.on("connection-success", success => {
      console.log(success)
    })

    socket.on("sdp", data => {
      console.log("sdp socketon",data)
      pc.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
      textRef.current.value = JSON.stringify(data.sdp)

      if(data?.sdp.type === "offer"){
        setOfferVisible(false)
        setAnswerVisible(true)
        setStatus("incoming call....")
      } else{
        setStatus("call Established")
      }
    })

    socket.on('candidate', candidate => {
      console.log("candidate socketon",candidate)
      pc.current.addIceCandidate(new RTCIceCandidate(candidate))
    })

    const _pc = new RTCPeerConnection(null)

    const constraints = {
      audio: false,
      video: true,
    }

    navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      localVideoRef.current.srcObject = stream
      stream.getTracks().forEach( track => {
        _pc.addTrack(track, stream)
      })
    })
    .catch( err => console.log("inside get user media stream",err))

    shareScreen(_pc)

    //creating new rtc connection
    _pc.onicecandidate = (e) => {
      if(e.candidate) {
        console.log(JSON.stringify(e.candidate))
        sendToPeer('candidate', e.candidate)
      }
    }

    //helps check ice connection status such as connected, disconnected, failed or closed
    _pc.oniceconnectionstatechange = (e) => {
      console.log("state changed ",e)
    }

    //generates media stream tracks
    _pc.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0]
    }

    pc.current = _pc
  }, [])

  // const shareScreen = (pc) => {
  //   navigator.mediaDevices.getDisplayMedia({
  //     video: {
  //         cursor: "always"
  //     },
  //     audio: false
  //   })
  //   .then(stream => {
  //     remoteVideoRef.current.srcObject = stream
  //     stream.getTracks().forEach(track => {
  //       pc.addTrack(track, stream)
  //     })
  //   })
  // }

  const sendToPeer = (eventType, payload) => {
    socket.emit(eventType, payload)
  }

  const processSDP = (sdp) => {
    pc.current.setLocalDescription(sdp)
    sendToPeer('sdp', {sdp})
  }

  const createOffer = () => {
    pc.current.createOffer({
      offerToReceiveVideo: 1,
      offerToReceiveAudio: 1,

    }).then(
      sdp => {
        processSDP(sdp)
        setOfferVisible(false)
        setStatus("Calling the user")
      }).catch(err=> console.log("error in creating offer", err))
  }
  
  const createAnswer = () => {
    pc.current.createAnswer({
      offerToReceiveVideo: 1,
      offerToReceiveAudio: 1,

    }).then(
        sdp => {
          processSDP(sdp)
          setAnswerVisible(true)
          setStatus("call established")
        }
    ).catch(err=> console.log("error in creating answer", err))
  }

  const showHideButtons = () => {
    if(offerVisible){
      return (
        <div>
          <button onClick={createOffer}> Call </button>
        </div>
      )
    } else if (answerVisible){
      return (
        <div>
          <button onClick={createAnswer}> Answer </button>
        </div>
      )
    }
  }

  return (
    <div style={{ margin: 10 }}>
      <video ref={localVideoRef} autoPlay 
      style={{
        width: 240, height: 240, margin: 10, background:'black'
      }} > </video>
      
      <video ref={remoteVideoRef} autoPlay 
      style={{
        width: 240, height: 240, margin: 10,  background:'black'
      }} > </video>

      <br />
      <textarea ref={textRef}></textarea>
      <br />

      {showHideButtons()}
      <div>{status}</div>
      {/* <button onClick={shareScreen}> Share your screen </button> */}
  </div>
  )
}

export default App
