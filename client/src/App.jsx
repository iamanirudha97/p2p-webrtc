import { useEffect, useReducer, useRef, useMemo } from 'react'
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
  const candidates = useRef([])

  useEffect(() => {
    socket.on("connection-success", success => {
      console.log(success)
    })

    socket.on("sdp", data => {
      // console.log("offer/answer from server: data", data)
      textRef.current.value = JSON.stringify(data.sdp)
    })

    socket.on('candidate', candidate => {
      candidates.current = [...candidates.current, candidate]
    })

    const _pc = new RTCPeerConnection(null)

    const constraints = {
      audio: false,
      video: true,
    }

    console.log("fn fired ")
    navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      localVideoRef.current.srcObject = stream

      stream.getTracks().forEach( track => {
        _pc.addTrack(track, stream)
      })
    })
    .catch( err => console.log("inside get user media stream",err))

    //creating new rtc connection
    _pc.onicecandidate = (e) => {
      if(e.candidate) {
        console.log(JSON.stringify(e.candidate))

        socket.emit('candidate', e.candidate)
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

  const addCandidate = () => {
    candidates.current.forEach(candidate => {
      // console.log('candidate from addCandidate', candidate)
      pc.current.addIceCandidate(new RTCIceCandidate(candidate))
    })
  }

  const setRemoteDescription = () => {
    const sdp = JSON.parse(textRef.current.value)
    pc.current.setRemoteDescription(new RTCSessionDescription(sdp))
    console.log(sdp)
  }

  const createOffer = () => {
    pc.current.createOffer({
      offerToReceiveVideo: 1,
      offerToReceiveAudio: 1,

    }).then(
      sdp => {
        pc.current.setLocalDescription(sdp)

        //send sdp to signalling server
        socket.emit("sdp", {
          sdp,
        })
      }
    ).catch(err=> console.log("error in creating offer", err))
  }
  
  const createAnswer = () => {
    pc.current.createAnswer({
      offerToReceiveVideo: 1,
      offerToReceiveAudio: 1,

    }).then(
      sdp => {
        console.log(JSON.stringify(sdp))
        pc.current.setLocalDescription(sdp)

        socket.emit("sdp", {
          sdp
        })
      }
    ).catch(err=> console.log("error in creating answer", err))
  }

  // const getUserMedia = () => {
  //   const constraints = {
  //     audio: false,
  //     video: true,
  //   }

  //   console.log("fn fired ")
  //   navigator.mediaDevices.getUserMedia(constraints)
  //   .then(stream => {
  //     console.log("inside stream ")
  //     localVideoRef.current.srcObject = stream
  //     stream.getTracks().forEach( track => 
        
  //     )
  //   })
  //   .catch( err => console.log("inside get user media stream",err))
  // }

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

    <button onClick={() => {createOffer()}}> create Offer</button>
    <button onClick={() => {createAnswer()}}> create answer</button>
    <button onClick={() => {setRemoteDescription()}}> set sdp</button>
    <button onClick={() => {addCandidate()}}>  add candidate </button>
  
  </div>
  )
}

export default App
