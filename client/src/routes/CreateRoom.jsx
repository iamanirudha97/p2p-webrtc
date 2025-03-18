import React from "react";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import { v1 as uuid } from "uuid";

const CreateRoom = (props) => {
    let history = useHistory()
    function create() {
        const id = uuid();
        props.history.push(`/room/${id}`);
        // history.push(`/room`);
    }

    return (
        <button onClick={create}>Create Room</button>
    );
}

export default CreateRoom;