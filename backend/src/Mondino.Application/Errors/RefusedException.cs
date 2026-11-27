namespace Mondino.Application.Errors;

/// <summary>
/// A handler's refusal: the HTTP status and the <c>code</c> a client branches on. The API writes it
/// as ProblemDetails. It carries no request data.
/// </summary>
public sealed class RefusedException(int status, string code) : Exception(code)
{
    public int Status { get; } = status;

    public string Code { get; } = code;

    public static RefusedException NotFound(string code) => new(404, code);
}
