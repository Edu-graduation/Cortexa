CREATE TABLE institution (
    institution_id SMALLINT PRIMARY KEY GENERATED ALWAYS AS idENTITY,
    institution_name VARCHAR(50) NOT NULL
);

CREATE TABLE instructor (
    instructor_id BIGINT PRIMARY KEY,
    instructor_name VARCHAR(40) NOT NULL,
    instructor_pass VARCHAR(12) NOT NULL
);

CREATE TABLE student (
    student_id BIGINT PRIMARY KEY,
    student_name VARCHAR(40) NOT NULL,
    student_password VARCHAR(12) NOT NULL,
    student_level SMALLINT NOT NULL,
    student_major VARCHAR(25) NOT NULL,
    student_CGPA DECIMAL(3,2) NOT NULL CHECK(student_CGPA BETWEEN 0.00 AND 4.00),
    institution_id SMALLINT NOT NULL,
    FOREIGN KEY (institution_id) REFERENCES institution (institution_id) ON DELETE CASCADE
);



CREATE TABLE course (
    course_id INT PRIMARY KEY GENERATED ALWAYS AS idENTITY,
    course_name VARCHAR(50) NOT NULL,
    course_description VARCHAR(255)
);

CREATE TABLE session (
    session_id INT PRIMARY KEY GENERATED ALWAYS AS idENTITY,
    session_type VARCHAR(10) NOT NULL CHECK (session_type IN ('lecture', 'section', 'session')),
    session_place VARCHAR(30) NOT NULL,
    session_file_path VARCHAR(255) NOT NULL,
    session_time TIMESTAMP NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE
);

CREATE TABLE chat (
    chat_id SMALLINT PRIMARY KEY GENERATED ALWAYS AS idENTITY,
    chat_Name VARCHAR(100) NOT NULL
);






CREATE TABLE message (
    msg_id BIGINT PRIMARY KEY GENERATED ALWAYS AS idENTITY,
    msg_content TEXT NOT NULL,
    msg_date_time TIMESTAMP NOT NULL,
    sender_data char(58) NOT NULL ,
    chat_id SMALLINT NOT NULL,
    FOREIGN KEY (chat_id ) REFERENCES chat(chat_id) ON DELETE CASCADE
);

CREATE TABLE activity (
    activity_id INT PRIMARY KEY GENERATED ALWAYS AS idENTITY,
    activity_title VARCHAR(100) NOT NULL,
    activity_description TEXT NOT NULL,
    activity_dueDate TIMESTAMP NOT NULL,
    instructor_id BIGINT NOT NULL,
    FOREIGN KEY (instructor_id) REFERENCES instructor(instructor_id) ON DELETE CASCADE
);

CREATE TABLE assignment (
    assign_id INT PRIMARY KEY GENERATED ALWAYS AS idENTITY,
    assign_title VARCHAR(100) NOT NULL,
    assign_description TEXT NOT NULL,
    assign_dueDate TIMESTAMP NOT NULL,
    instructor_id BIGINT NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (instructor_id) REFERENCES instructor(instructor_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE
);


CREATE TABLE quiz (
    quiz_id INT PRIMARY KEY GENERATED ALWAYS AS idENTITY,
    quiz_title VARCHAR(100) NOT NULL,
    quiz_duration INTERVAL HOUR TO MINUTE NOT NULL,
    quiz_dueDateTime TIMESTAMP NOT NULL,
    quiz_questions jsonb NOT NULL,
    instructor_id BIGINT NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (instructor_id) REFERENCES instructor(instructor_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE
);

CREATE TABLE calendar_event (
    event_id INT PRIMARY KEY GENERATED ALWAYS AS idENTITY,
    event_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_details TEXT NOT NULL,
    event_startdatetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_enddatetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    instructor_id BIGINT,
    student_id BIGINT NOT NULL,
    FOREIGN KEY (instructor_id) REFERENCES instructor(instructor_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE
);

-- Many-to-Many Relationship Tables

CREATE TABLE instructor_institution (
    instructor_id BIGINT,
    institution_id SMALLINT,
    PRIMARY KEY (instructor_id, institution_id),
    FOREIGN KEY (instructor_id) REFERENCES instructor(instructor_id) ON DELETE CASCADE,
    FOREIGN KEY (institution_id) REFERENCES institution(institution_id) ON DELETE CASCADE
);

--
CREATE TABLE enrollment (
    student_id BIGINT,
    instructor_id BIGINT,
    course_id INT,
    PRIMARY KEY (student_id, instructor_id, course_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES instructor(instructor_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE
);

CREATE TABLE student_chat (
    student_id BIGINT,
    chat_id SMALLINT,
    PRIMARY KEY (student_id, chat_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
    FOREIGN KEY (chat_id) REFERENCES chat(chat_id) ON DELETE CASCADE
);

CREATE TABLE instructor_chat (
    instructor_id BIGINT,
    chat_id SMALLINT,
    PRIMARY KEY (instructor_id, chat_id),
    FOREIGN KEY (instructor_id) REFERENCES instructor(instructor_id) ON DELETE CASCADE,
    FOREIGN KEY (chat_id) REFERENCES chat(chat_id) ON DELETE CASCADE
);

CREATE TABLE student_quiz (
    student_id BIGINT,
    quiz_id INT,
    score DECIMAL(5,2) NOT NULL,
    student_answers jsonb null, 
    PRIMARY KEY (student_id, quiz_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quiz(quiz_id) ON DELETE CASCADE
);

--
CREATE TABLE student_assignment (
    student_id BIGINT,
    assign_id INT,
    assign_path text null,
    PRIMARY KEY (student_id, assign_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
    FOREIGN KEY (assign_id) REFERENCES assignment(assign_id) ON DELETE CASCADE
);

CREATE TABLE student_activity (
    student_id BIGINT,
    activity_id INT,
    team_id INT NOT NULL,
    activity_path text null,
    PRIMARY KEY (student_id, activity_id),
    FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activity(activity_id) ON DELETE CASCADE
);
CREATE TABLE course_activity (
    course_id INT,
    activity_id INT,
    PRIMARY KEY (course_id, activity_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activity(activity_id) ON DELETE CASCADE
);
