const getRandomUsername = () => {
    const adjectives = [
        "cool",
        "fast",
        "silent",
        "dark",
        "happy",
        "wild",
        "smart",
        "crazy",
        "tiny",
        "brave",
    ];

    const nouns = [
        "fox",
        "wolf",
        "tiger",
        "panda",
        "eagle",
        "cat",
        "bear",
        "dragon",
        "otter",
        "hawk",
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];

    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    const number = Math.floor(1000 + Math.random() * 9000);

    return `${adjective}_${noun}_${number}`;
};

module.exports = { getRandomUsername };
